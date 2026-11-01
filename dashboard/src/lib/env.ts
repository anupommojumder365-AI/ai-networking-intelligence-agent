// Server-only environment access. Getters keep `next build` working without secrets.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  get supabaseUrl() { return req('SUPABASE_URL'); },
  get serviceRoleKey() { return req('SUPABASE_SERVICE_ROLE_KEY'); },
  get dashboardPassword() { return req('DASHBOARD_PASSWORD'); },
  get sessionSecret() { return req('SESSION_SECRET'); },
  get gatewayUrl() { return req('N8N_GATEWAY_URL'); },
  get gatewaySecret() { return req('N8N_GATEWAY_SECRET'); },
  get ownerTelegramId(): number | null {
    const v = Number(process.env.OWNER_TELEGRAM_ID);
    return Number.isFinite(v) && v > 0 ? v : null;
  },
};

/** Which variables are set (booleans only, never values). */
export function envPresence(): Record<string, boolean> {
  const names = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DASHBOARD_PASSWORD',
    'SESSION_SECRET',
    'N8N_GATEWAY_URL',
    'N8N_GATEWAY_SECRET',
    'OWNER_TELEGRAM_ID',
  ];
  return Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])]));
}
