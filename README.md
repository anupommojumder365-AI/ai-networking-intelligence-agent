# AI Networking Intelligence Agent | Professional Growth & LinkedIn Research System

An n8n-based automation system that researches public, professional information relevant to career growth and networking — career opportunities, industry leaders, potential clients, and relevant LinkedIn discussions — and delivers reviewable recommendations through a private Telegram bot.

The system **never performs any action on LinkedIn**. It only researches, scores, and drafts suggestions (connection notes, comments). All outreach is reviewed and carried out manually by the user, and only actions the user explicitly confirms (via Telegram buttons) are recorded as "done."

## How it works

The system is built as four connected n8n workflows:

| Workflow | Role |
|---|---|
| **NIS 01 - Telegram Command Router** | The entry point. Authenticates the user against an allowlist, parses Telegram commands (`/run`, `/status`, `/people`, `/posts`, `/career`, `/clients`, `/history`, `/report`, `/done`, `/stop`, `/help`) and button callbacks, and routes each request to the database or to the research orchestrator. |
| **NIS 02 - Research Orchestrator** | The core engine. Builds targeted search queries, runs them through the Brave Search API, filters and deduplicates results, analyzes candidates with Claude (with an OpenAI fallback), scores and classifies people/posts/career leads, persists results to Supabase, and compiles a report. |
| **NIS 03 - Telegram Delivery** | A shared delivery sub-workflow that formats and sends text messages, person cards, and post cards to Telegram, each with inline action buttons (Mark Sent, Mark Connected, Reviewed, Skip, etc.). |
| **NIS 04 - Error Handler** | A workflow-level error trap. Logs failures to Supabase and alerts the owner on Telegram, with secrets redacted from any logged output. |

### Design principles

- **Human-in-the-loop by design** — the agent only researches and drafts; every LinkedIn action is manual and confirmed by the user via button press.
- **Evidence-based scoring** — people, posts, and job leads are scored only from what the search snippets actually state; unverifiable claims are explicitly flagged as `unknown_facts` or left out rather than guessed.
- **Private by default** — only an allowlisted Telegram user ID can interact with the bot; all other messages are ignored or rejected.
- **Resilient** — AI analysis falls back from Claude to OpenAI if the primary call fails; a stop/safe-checkpoint mechanism lets a running research pass be cancelled mid-way; all workflow errors are centrally logged and alerted.

## Stack

- **[n8n](https://n8n.io)** — workflow orchestration
- **[Supabase](https://supabase.com)** (Postgres) — persistence: tracked people, posts, career leads, run/report history, allowlist, error logs
- **[Telegram Bot API](https://core.telegram.org/bots/api)** — the user-facing control interface and delivery channel
- **Brave Search API** — public web/LinkedIn search discovery
- **Apify** — supplementary data extraction (planned/optional per run)
- **Claude (Anthropic) / OpenAI** — candidate analysis, scoring, and message/comment drafting

## Repository contents

```
workflows/
  NIS-01-telegram-command-router.json   Telegram command + callback router
  NIS-02-research-orchestrator.json     Search → analysis → persistence → report
  NIS-03-telegram-delivery.json         Shared Telegram message/card delivery
  NIS-04-error-handler.json             Centralized error logging + alerting
```

These are exported n8n workflow definitions. **No credentials, API keys, or secrets are included** — n8n never exports secret values, only references to credentials configured in the n8n instance, and those references have been further replaced with placeholders (e.g. `YOUR_SUPABASE_PROJECT_REF`, `YOUR_ALLOWLIST_DATA_TABLE_ID`) in this repository.

## Setup

To run this system yourself, you will need:

1. An **n8n** instance (cloud or self-hosted) with the Telegram, HTTP Request, Code, Data Table, LangChain (Anthropic + OpenAI), and Brave Search nodes available.
2. A **Telegram bot** (via [@BotFather](https://t.me/BotFather)) and your Telegram numeric user ID added to an allowlist data table.
3. A **Supabase** project with the `nis_*` Postgres functions this system calls (run tracking, person/post/career upsert and scoring, logging) and a `telegram_user_id` allowlist table.
4. A **Brave Search API** key, and API keys for **Anthropic (Claude)** and **OpenAI**.
5. Import each JSON file in `workflows/` into n8n, reconnect the credentials (Telegram, Supabase) in each node, replace the placeholder values (Supabase project reference, data table ID, sub-workflow IDs) with your own, and activate the workflows.

## Status

Active development project — built and maintained by Anupom Mojumder, AI Automation Engineer.
