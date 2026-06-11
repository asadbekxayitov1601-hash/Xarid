import { prisma } from "@/lib/db";

// Paynet merchant protocol: JSON-RPC 2.0 over a single Basic-auth POST
// endpoint. Methods: GetInformation, PerformTransaction, CheckTransaction,
// CancelTransaction, GetStatement, ChangePassword. Amounts in TIYIN.
// PerformTransaction IS the payment execution (no separate confirm step).
export const PAYNET_ERROR = {
  JSON_PARSING: -32700,
  INVALID_RPC: -32600,
  METHOD_NOT_FOUND: -32601,
  TRANSACTION_ALREADY_EXISTS: 201,
  TRANSACTION_NOT_FOUND: 203,
  CLIENT_NOT_FOUND: 302, // also "already paid" per protocol
  SERVICE_NOT_FOUND: 305,
  INVALID_LOGIN_OR_PASSWORD: 412,
  INVALID_AMOUNT: 413,
} as const;

type RpcBody = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: {
    serviceId?: number | string;
    transactionId?: string | number;
    amount?: number;
    fields?: { order_id?: string };
    dateFrom?: string;
    dateTo?: string;
  };
};

export type PaynetResult = { httpStatus: number; body: Record<string, unknown> };

const ok = (id: RpcBody["id"], result: unknown): PaynetResult => ({
  httpStatus: 200,
  body: { jsonrpc: "2.0", id: id ?? null, result },
});

const err = (id: RpcBody["id"], code: number, message: string, httpStatus = 200): PaynetResult => ({
  httpStatus,
  body: { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
});

const plain = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ` +
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

/** Basic-auth check against PAYNET_USERNAME / PAYNET_PASSWORD. */
export function paynetAuthOk(authorization: string | null): boolean {
  const user = process.env.PAYNET_USERNAME;
  const pass = process.env.PAYNET_PASSWORD;
  if (!user || !pass) return false;
  const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  return authorization === expected;
}

export async function handlePaynet(body: RpcBody): Promise<PaynetResult> {
  const id = body.id;
  if (!body.jsonrpc || !body.method || body.id === undefined || !body.params) {
    return err(id, PAYNET_ERROR.INVALID_RPC, "Invalid RPC request");
  }
  const params = body.params;

  const expectedService = process.env.PAYNET_SERVICE_ID ?? "";
  if (params.serviceId !== undefined && expectedService && String(params.serviceId) !== expectedService) {
    return err(id, PAYNET_ERROR.SERVICE_NOT_FOUND, "Service not found");
  }

  switch (body.method) {
    case "GetInformation": {
      const orderId = params.fields?.order_id;
      const order = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
      if (!order || order.status === "CANCELLED") {
        return err(id, PAYNET_ERROR.CLIENT_NOT_FOUND, "Buyurtma topilmadi");
      }
      if (order.paidAt) return err(id, PAYNET_ERROR.CLIENT_NOT_FOUND, "Allaqachon to'langan");
      return ok(id, {
        status: "0",
        timestamp: plain(new Date()),
        fields: { order_id: order.id, name: order.buyerName },
        balance: order.total * 100,
      });
    }

    case "PerformTransaction": {
      const orderId = params.fields?.order_id;
      const transactionId = String(params.transactionId ?? "");
      if (!orderId || !transactionId || !params.amount) {
        return err(id, PAYNET_ERROR.INVALID_RPC, "Missing parameters");
      }
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.status === "CANCELLED") {
        return err(id, PAYNET_ERROR.CLIENT_NOT_FOUND, "Buyurtma topilmadi");
      }

      const existing = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "PAYNET", externalId: transactionId } },
      });
      if (existing) return err(id, PAYNET_ERROR.TRANSACTION_ALREADY_EXISTS, "Transaction already exists");

      if (order.paidAt) return err(id, PAYNET_ERROR.CLIENT_NOT_FOUND, "Allaqachon to'langan");
      if (Math.round(params.amount / 100) !== order.total) {
        return err(id, PAYNET_ERROR.INVALID_AMOUNT, "Incorrect amount");
      }

      const paidAt = new Date();
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "PAYNET",
          externalId: transactionId,
          amount: order.total,
          status: "PAID",
          paidAt,
        },
      });
      await prisma.order.update({ where: { id: order.id }, data: { paidAt } });

      return ok(id, {
        providerTrnId: Number(payment.clickPrepareId),
        timestamp: plain(paidAt),
        fields: { order_id: order.id },
      });
    }

    case "CheckTransaction": {
      const transactionId = String(params.transactionId ?? "");
      const payment = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "PAYNET", externalId: transactionId } },
      });
      if (!payment) {
        return ok(id, { transactionState: 3, providerTrnId: 0, timestamp: plain(new Date()) });
      }
      return ok(id, {
        transactionState: payment.status === "PAID" ? 1 : 2,
        providerTrnId: Number(payment.clickPrepareId),
        timestamp: plain(payment.paidAt ?? payment.createdAt),
      });
    }

    case "CancelTransaction": {
      const transactionId = String(params.transactionId ?? "");
      const payment = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "PAYNET", externalId: transactionId } },
      });
      if (!payment) return err(id, PAYNET_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

      if (payment.status !== "CANCELLED") {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
        if (payment.status === "PAID") {
          await prisma.order.update({ where: { id: payment.orderId }, data: { paidAt: null } });
        }
      }
      return ok(id, {
        providerTrnId: Number(payment.clickPrepareId),
        timestamp: plain(new Date()),
        transactionState: 2,
      });
    }

    case "GetStatement": {
      const from = params.dateFrom ? new Date(params.dateFrom) : null;
      const to = params.dateTo ? new Date(params.dateTo) : null;
      if (!from || !to || isNaN(+from) || isNaN(+to)) {
        return err(id, PAYNET_ERROR.INVALID_RPC, "Invalid date range");
      }
      const payments = await prisma.payment.findMany({
        where: { provider: "PAYNET", status: { not: "CANCELLED" }, createdAt: { gte: from, lte: to } },
      });
      return ok(id, {
        statements: payments.map((p) => ({
          amount: p.amount * 100,
          providerTrnId: Number(p.clickPrepareId),
          transactionId: p.externalId,
          timestamp: plain(p.createdAt),
        })),
      });
    }

    case "ChangePassword":
      return ok(id, "success");

    default:
      return err(id, PAYNET_ERROR.METHOD_NOT_FOUND, `method ${body.method} is not supported`);
  }
}
