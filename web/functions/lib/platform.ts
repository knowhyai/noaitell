// Minimal structural types shared by Pages Functions and the route tests.
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  run(): Promise<unknown>;
}
export interface Env {
  PAYMENTS_DB?: { prepare(sql: string): Statement };
  WAFFO_STORE_ID?: string;
}
export interface Context { request: Request; env: Env }
