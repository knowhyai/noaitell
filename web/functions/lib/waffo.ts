// Server-only: never import this module from src/ or a generated HTML page.
import process from 'node:process';
import { WaffoPancake } from '@waffo/pancake-ts';

type EnvMap = {
  WAFFO_MERCHANT_ID?: string;
  WAFFO_PRIVATE_KEY?: string;
  WAFFO_PRODUCT_MONTHLY?: string;
  WAFFO_PRODUCT_DAY?: string;
  WAFFO_PRODUCT_YEARLY?: string;
};

function read(env: EnvMap | undefined, key: keyof EnvMap) {
  return env?.[key] || process.env[key];
}

export function createClient(env?: EnvMap) {
  const merchantId = read(env, 'WAFFO_MERCHANT_ID');
  const privateKey = read(env, 'WAFFO_PRIVATE_KEY');
  if (!merchantId || !privateKey) {
    throw new Error('Payments are not configured');
  }
  return new WaffoPancake({
    merchantId,
    privateKey,
    environment: 'test',
  });
}

export function productFor(plan: string, env?: EnvMap): string | undefined {
  const products: Record<string, string | undefined> = {
    monthly: read(env, 'WAFFO_PRODUCT_MONTHLY'),
    day: read(env, 'WAFFO_PRODUCT_DAY'),
    yearly: read(env, 'WAFFO_PRODUCT_YEARLY'),
  };
  const id = products[plan];
  return id && /^PROD_[A-Za-z0-9]+$/.test(id) ? id : undefined;
}
