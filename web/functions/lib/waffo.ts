// Server-only: never import this module from src/ or a generated HTML page.
import process from 'node:process';
import { WaffoPancake } from '@waffo/pancake-ts';

export function createClient() {
  if (!process.env.WAFFO_MERCHANT_ID || !process.env.WAFFO_PRIVATE_KEY) {
    throw new Error('Payments are not configured');
  }
  return new WaffoPancake({
    merchantId: process.env.WAFFO_MERCHANT_ID,
    privateKey: process.env.WAFFO_PRIVATE_KEY,
    environment: 'test',
  });
}

export function productFor(plan: string): string | undefined {
  const products: Record<string, string | undefined> = {
    monthly: process.env.WAFFO_PRODUCT_MONTHLY,
    day: process.env.WAFFO_PRODUCT_DAY,
    yearly: process.env.WAFFO_PRODUCT_YEARLY,
  };
  const id = products[plan];
  return id && /^PROD_[A-Za-z0-9]+$/.test(id) ? id : undefined;
}
