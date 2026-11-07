// Minimal structural types shared by Pages Functions and the route tests.
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  run(): Promise<unknown>;
}
export interface Env {
  PAYMENTS_DB?: { prepare(sql: string): Statement };
  WAFFO_STORE_ID?: string;
  WAFFO_MERCHANT_ID?: string;
  WAFFO_PRIVATE_KEY?: string;
  WAFFO_PRODUCT_MONTHLY?: string;
  WAFFO_PRODUCT_DAY?: string;
  WAFFO_PRODUCT_YEARLY?: string;
}
export interface Context { request: Request; env: Env }
