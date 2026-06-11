import { createHash } from "crypto";
import { prisma } from "@/lib/db";

// Click SHOP-API (docs.click.uz): Click POSTs form-encoded prepare (action=0)
// and complete (action=1) requests, signed with
//   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id +
//       [merchant_prepare_id (complete only)] + amount + action + sign_time)
// We answer with their numeric error codes:
const E = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

type ClickParams = Record<string, string>;

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function verifySign(p: ClickParams, withPrepareId: boolean): boolean {
  const secret = process.env.CLICK_SECRET_KEY ?? "";
  const base =
    p.click_trans_id +
    p.service_id +
    secret +
    p.merchant_trans_id +
    (withPrepareId ? p.merchant_prepare_id : "") +
    p.amount +
    p.action +
    p.sign_time;
  return md5(base) === p.sign_string;
}

export async function handleClick(p: ClickParams) {
  const respond = (error: number, extra: Record<string, unknown> = {}) => ({
    click_trans_id: Number(p.click_trans_id),
    merchant_trans_id: p.merchant_trans_id,
    error,
    error_note: error === 0 ? "Success" : "Error",
    ...extra,
  });

  if (!p.click_trans_id || !p.merchant_trans_id || !p.amount || p.action === undefined || !p.sign_time || !p.sign_string) {
    return respond(E.BAD_REQUEST);
  }

  // PREPARE
  if (p.action === "0") {
    if (!verifySign(p, false)) return respond(E.SIGN_CHECK_FAILED);

    const order = await prisma.order.findUnique({ where: { id: p.merchant_trans_id } });
    if (!order) return respond(E.ORDER_NOT_FOUND);
    if (order.status === "CANCELLED") return respond(E.TRANSACTION_CANCELLED);
    if (order.paidAt) return respond(E.ALREADY_PAID);
    if (Math.round(parseFloat(p.amount)) !== order.total) return respond(E.INCORRECT_AMOUNT);

    const payment = await prisma.payment.upsert({
      where: { provider_externalId: { provider: "CLICK", externalId: p.click_trans_id } },
      update: {},
      create: { orderId: order.id, provider: "CLICK", externalId: p.click_trans_id, amount: order.total },
    });
    return respond(E.SUCCESS, { merchant_prepare_id: Number(payment.clickPrepareId) });
  }

  // COMPLETE
  if (p.action === "1") {
    if (!verifySign(p, true)) return respond(E.SIGN_CHECK_FAILED);

    const payment = await prisma.payment.findUnique({
      where: { clickPrepareId: BigInt(p.merchant_prepare_id ?? 0) },
      include: { order: true },
    });
    if (!payment || payment.externalId !== p.click_trans_id) return respond(E.TRANSACTION_NOT_FOUND);

    // Click signals a failed/cancelled payment with a negative error in the request.
    if (Number(p.error) < 0) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      return respond(E.TRANSACTION_CANCELLED);
    }

    if (payment.status === "PAID") return respond(E.ALREADY_PAID);
    if (payment.status === "CANCELLED") return respond(E.TRANSACTION_CANCELLED);
    if (Math.round(parseFloat(p.amount)) !== payment.amount) return respond(E.INCORRECT_AMOUNT);

    const paidAt = new Date();
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt } });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paidAt } });

    return respond(E.SUCCESS, { merchant_confirm_id: Number(payment.clickPrepareId) });
  }

  return respond(E.ACTION_NOT_FOUND);
}
