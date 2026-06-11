// Buyer-facing payment links. Buttons render only when the provider's env
// vars are configured, so unconfigured providers simply don't appear.

export function clickPayUrl(orderId: string, amount: number): string | null {
  const serviceId = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  if (!serviceId || !merchantId) return null;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/orders`;
  return (
    `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}` +
    `&amount=${amount}&transaction_param=${orderId}&return_url=${encodeURIComponent(returnUrl)}`
  );
}

// Paynet payment link template from the Paynet cabinet, e.g.
//   PAYNET_PAY_URL_TEMPLATE="https://app.paynet.uz/...?order_id={orderId}&amount={amountTiyin}"
export function paynetPayUrl(orderId: string, amount: number): string | null {
  const template = process.env.PAYNET_PAY_URL_TEMPLATE;
  if (!template) return null;
  return template.replaceAll("{orderId}", orderId).replaceAll("{amountTiyin}", String(amount * 100));
}

// Uzum checkout URL template, e.g.
//   UZUM_PAY_URL_TEMPLATE="https://www.uzumbank.uz/open-service?serviceId=123&orderId={orderId}&amount={amountTiyin}"
// Placeholders {orderId} and {amountTiyin} are substituted. Take the exact
// link format from your Uzum merchant cabinet.
export function uzumPayUrl(orderId: string, amount: number): string | null {
  const template = process.env.UZUM_PAY_URL_TEMPLATE;
  if (!template) return null;
  return template.replaceAll("{orderId}", orderId).replaceAll("{amountTiyin}", String(amount * 100));
}
