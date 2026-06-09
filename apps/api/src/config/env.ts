export function readEnv() {
  return {
    port: Number(process.env.API_PORT ?? 3000),
    databaseUrl: process.env.DATABASE_URL ?? "",
    zdhcRulesetVersion: process.env.ZDHC_RULESET_VERSION ?? "placeholder",
  };
}
