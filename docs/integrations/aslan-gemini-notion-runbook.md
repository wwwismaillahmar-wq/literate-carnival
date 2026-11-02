# ASLAN Gemini–Notion bridge: development runbook

Status: development-only, not production approved. This is a localhost HTTP service, NOT a connection inside the official Gemini mobile app.

## Setup
Rotate any previously exposed Notion integration token. Create a new restricted integration, share ONLY a dedicated test archive root page, and grant read/insert/update capabilities. Never commit credentials.

Required private environment variables: `GEMINI_API_KEY`, `NOTION_API_KEY`, `ASLAN_NOTION_ROOT_PAGE_ID`, `ASLAN_DEV_ACCESS_KEY` (minimum 32 random characters). Optional `GEMINI_MODEL` (default `gemini-2.5-flash`); `ASLAN_NOTION_WRITE_ENABLED=true` (default disabled). Run `python3 scripts/integrations/aslan_agent.py`. It binds 127.0.0.1 only.

## Local tests
`python3 -m unittest discover -s tests/integrations -p 'test_aslan_agent.py' -v`
`python3 -m py_compile scripts/integrations/aslan_agent.py`

## API
POST `http://127.0.0.1:8765/api/assistant`, header `X-ASLAN-Dev-Key` with private dev secret, JSON:
- Chat: `{"operation":"chat","message":"..."}`
- Read: `{"operation":"read","args":{"page_id":"..."}}`
- Prepare write: `{"operation":"prepare","action":"create","args":{"page_id":"...","title":"Test","content":"..."}}`
- Confirm: `{"operation":"confirm","approval_token":"TOKEN_FROM_PREPARE"}`
- Append uses action `append` and `page_id` + `content`.

A separate trusted UI must display the complete prepared action and require explicit human confirmation before submitting the approval token. The token alone does not prove human consent if an untrusted caller can invoke both endpoints. Therefore do not enable writes on a real archive or expose this service publicly.

## Remaining gates
- Verify credentials, model availability, Notion integration permissions and real test-page read/create/append.
- Add real authenticated users, separate approval authority, durable audit logs, throttling, per-user authorization, secure hosted transport, key rotation, and monitoring.
- Review Notion database-parent support, page ancestry edge cases, block/file limits, and model prompt-injection handling.
- Test in development with a dedicated page; no merge or production deployment until independent review.

No live Gemini/Notion call was made during initial development.
