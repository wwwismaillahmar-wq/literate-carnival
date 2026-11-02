# ASLAN Gemini–Notion development bridge

Development design and security gate. The existing `scripts/integrations/extract_notion.py` is a read-only extractor, not a Gemini connector.

## Architecture
Gemini API -> authenticated ASLAN backend -> Notion API. Restrict to an explicitly approved archive root. Require human confirmation for every write; no delete or permission modification. Store GEMINI_API_KEY and NOTION_API_KEY only as server secrets; rotate the exposed Notion token.

## Acceptance before production
1. Confirm current Gemini API model and credentials.
2. Implement server-only authenticated endpoint with per-user permissions, audit log, and rate limits.
3. Implement page read/create/append/update, pagination and 429 retry.
4. Verify Notion page ancestry and access scope; reject other pages.
5. Test with an isolated Notion test page; verify read, create, edit, rejection of unauthorized page, rejection of unconfirmed write.
6. Review logs, key rotation and deployment security.

Do not deploy to production or claim Gemini mobile app integration.