# NIS Command Center

Next.js 15 + TypeScript + Tailwind dashboard for the AI Networking Intelligence system.
Vercel hosts the UI; **n8n stays the automation engine**, Supabase stays the database.

## How control works (Telegram and dashboard share one engine)
- **Start:** `POST /api/agent/start` -> n8n `NIS 05 - Dashboard Gateway` (secret header) -> the same
  `NIS 02 - Research Orchestrator` that Telegram `/run` starts. The authoritative lock is the
  Supabase RPC `nis_start_run`; a second start from either interface is refused.
- **Stop:** `POST /api/agent/stop` calls the same RPC as Telegram `/stop` (`nis_request_stop`).
- **Status:** read from `linkedin_reports`, polled every few seconds (SWR), so a run started in
  Telegram appears here and vice versa. States: Idle / Running / Stopping / Completed / Failed.
- **Manual tracking:** buttons only update Supabase via `nis_apply_user_action`. Nothing here
  ever performs a LinkedIn action.
- Telegram commands/workflows (NIS 01-04) are untouched.

## Environment variables (all server-side, none `NEXT_PUBLIC_`)
See `.env.example`. You must supply:

| Variable | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Project Settings -> API -> service_role |
| `DASHBOARD_PASSWORD` | choose one |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `N8N_GATEWAY_SECRET` | value of row `gateway_secret` in n8n data table `nis_dashboard_config` |
| `OWNER_TELEGRAM_ID` | your Telegram user ID (same as in `nis_allowed_users`) |

`SUPABASE_URL` and `N8N_GATEWAY_URL` are prefilled in `.env.example`.

## Deploy to Vercel (free tier)
1. Push this folder to a Git repo and import it in Vercel (Next.js preset, no config needed).
2. Add the variables above under Project -> Settings -> Environment Variables.
3. Deploy, open the URL, sign in with `DASHBOARD_PASSWORD`.
4. Open **Settings**: each integration should show connected.

## Local
    cp .env.example .env.local   # fill values
    npm install && npm run dev

## Notes
- Realtime: tables are RLS deny-all (service role only), so the browser never talks to Supabase
  directly. Near-real-time = server-side API routes + polling, keeping secrets and data private.
- Free-tier friendly: no cron, no background jobs, short-lived API routes.
- Troubleshooting: `gateway_rejected_secret` = `N8N_GATEWAY_SECRET` differs from n8n's
  `gateway_secret`; `gateway_unreachable` = n8n down or blocked; `run_in_progress` = a run is active.
