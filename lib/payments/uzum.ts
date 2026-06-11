import { prisma } from "@/lib/db";

// Uzum Bank merchant webhook protocol (developer.uzumbank.uz): Basic-auth
// POSTs to /check, /create, /confirm, /reverse, /status. Amounts arrive in
// TIYIN (UZS × 100). Failures are HTTP 400 with a FAILED body and a numeric
// errorCode.
export const UZUM_ERROR = {
  AUTHORIZATION: 10001,
  PARSING_JSON: 10002,
  UNKNOWN_OPERATION: 10003,
  NOT_ENOUGH_PARAMS: 10005,
  INVALID_SERVICE_ID: 10006,
  ALREADY_PROCESSED: 10007,
  PROPERTY_NOT_FOUND: 10008,
  PAYMENT_CANCELLED: 10009,
  CHECK_FAILED: 99999,
} as const;

type UzumBody = {
  serviceId?: number | string;
  transId?: string;
  amount?: number;
  params?: { orderId?: string };
};

export type UzumResult = { httpStatus: number; body: Record<string, unknown> };

const now = () => Date.now();

function fail(serviceId: unknown, errorCode: number): UzumResult {
  return {
    httpStatus: 400,
    body: { serviceId, timestamp: now(), status: "FAILED", errorCode },
  };
}

function validServiceId(serviceId: unknown): boolean {
  return String(serviceId) === String(process.env.UZUM_SERVICE_ID ?? "");
}

/** Basic-auth check against UZUM_MERCHANT_USERNAME / UZUM_MERCHANT_PASSWORD. */
export function uzumAuthOk(authorization: string | null): boolean {
  const user = process.env.UZUM_MERCHANT_USERNAME;
  const pass = process.env.UZUM_MERCHANT_PASSWORD;
  if (!user || !pass) return false;
  const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  return authorization === expected;
}

export async function handleUzum(op: string, body: UzumBody): Promise<UzumResult> {
  const { serviceId, transId } = body;
  if (!validServiceId(serviceId)) return fail(serviceId, UZUM_ERROR.INVALID_SERVICE_ID);

  switch (op) {
    case "check": {
      const orderId = body.params?.orderId;
      if (!orderId) return fail(serviceId, UZUM_ERROR.NOT_ENOUGH_PARAMS);
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.status === "CANCELLED") return fail(serviceId, UZUM_ERROR.CHECK_FAILED);
      if (order.paidAt) return fail(serviceId, UZUM_ERROR.ALREADY_PROCESSED);
      return {
        httpStatus: 200,
        body: {
          serviceId,
          timestamp: now(),
          status: "OK",
          data: { account: { value: orderId } },
        },
      };
    }

    case "create": {
      const orderId = body.params?.orderId;
      if (!orderId || !transId || !body.amount) return fail(serviceId, UZUM_ERROR.NOT_ENOUGH_PARAMS);
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.status === "CANCELLED") return fail(serviceId, UZUM_ERROR.CHECK_FAILED);
      if (order.paidAt) return fail(serviceId, UZUM_ERROR.ALREADY_PROCESSED);
      if (Math.round(body.amount / 100) !== order.total) return fail(serviceId, UZUM_ERROR.CHECK_FAILED);

      const existing = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "UZUM", externalId: transId } },
      });
      if (existing) return fail(serviceId, UZUM_ERROR.ALREADY_PROCESSED);

      await prisma.payment.create({
        data: { orderId: order.id, provider: "UZUM", externalId: transId, amount: order.total },
      });
      return {
        httpStatus: 200,
        body: { serviceId, timestamp: now(), status: "CREATED", transTime: now(), transId, amount: body.amount },
      };
    }

    case "confirm": {
      if (!transId) return fail(serviceId, UZUM_ERROR.NOT_ENOUGH_PARAMS);
      const payment = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "UZUM", externalId: transId } },
      });
      if (!payment) return fail(serviceId, UZUM_ERROR.PROPERTY_NOT_FOUND);
      if (payment.status !== "PENDING") return fail(serviceId, UZUM_ERROR.ALREADY_PROCESSED);

      const paidAt = new Date();
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt } });
      await prisma.order.update({ where: { id: payment.orderId }, data: { paidAt } });
      return {
        httpStatus: 200,
        body: { serviceId, transId, status: "CONFIRMED", confirmTime: now() },
      };
    }

    case "reverse": {
      if (!transId) return fail(serviceId, UZUM_ERROR.NOT_ENOUGH_PARAMS);
      const payment = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "UZUM", externalId: transId } },
      });
      if (!payment) return fail(serviceId, UZUM_ERROR.PROPERTY_NOT_FOUND);

      await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      if (payment.status === "PAID") {
        await prisma.order.update({ where: { id: payment.orderId }, data: { paidAt: null } });
      }
      return {
        httpStatus: 200,
        body: { serviceId, transId, status: "REVERSED", reverseTime: now(), amount: payment.amount * 100 },
      };
    }

    case "status": {
      if (!transId) return fail(serviceId, UZUM_ERROR.NOT_ENOUGH_PARAMS);
      const payment = await prisma.payment.findUnique({
        where: { provider_externalId: { provider: "UZUM", externalId: transId } },
      });
      if (!payment) return fail(serviceId, UZUM_ERROR.PROPERTY_NOT_FOUND);
      const map: Record<string, string> = { PENDING: "CREATED", PAID: "CONFIRMED", CANCELLED: "REVERSED" };
      return {
        httpStatus: 200,
        body: { serviceId, transId, status: map[payment.status] ?? "FAILED" },
      };
    }

    default:
      return fail(serviceId, UZUM_ERROR.UNKNOWN_OPERATION);
  }
}
