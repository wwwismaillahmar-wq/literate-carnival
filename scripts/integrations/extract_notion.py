#!/usr/bin/env python3
"""ASLAN Notion archive extractor. Read-only; NOT a Gemini connector."""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.notion.com/v1"
VERSION = "2022-06-28"

def request(token, endpoint, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Authorization": "Bearer " + token, "Notion-Version": VERSION,
               "Content-Type": "application/json"}
    for attempt in range(6):
        req = urllib.request.Request(BASE + "/" + endpoint, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 5:
                delay = min(60, max(1, int(error.headers.get("Retry-After", "2"))))
                time.sleep(delay)
                continue
            raise RuntimeError("Notion API HTTP " + str(error.code)) from None
    raise RuntimeError("Notion API retries exhausted")

def paged(token, endpoint, method="GET", payload=None):
    results = []
    cursor = None
    while True:
        if method == "POST":
            body = dict(payload or {})
            body["page_size"] = 100
            if cursor:
                body["start_cursor"] = cursor
            response = request(token, endpoint, "POST", body)
        else:
            params = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor
            response = request(token, endpoint + "?" + urllib.parse.urlencode(params))
        results.extend(response.get("results", []))
        if not response.get("has_more"):
            return results
        cursor = response.get("next_cursor")
        if not cursor:
            raise RuntimeError("Notion pagination cursor missing")

def main():
    token = os.environ.get("NOTION_API_KEY", "").strip()
    if not token:
        raise RuntimeError("NOTION_API_KEY is required; never paste tokens into source code")
    output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "notion_archive_export")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    index = paged(token, "search", "POST", {})
    (output / "workspace_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    visited = set()
    def save_children(block_id):
        if block_id in visited:
            return
        visited.add(block_id)
        blocks = paged(token, "blocks/" + block_id + "/children")
        (output / ("blocks_" + block_id + ".json")).write_text(json.dumps(blocks, ensure_ascii=False, indent=2), encoding="utf-8")
        for block in blocks:
            if block.get("has_children"):
                save_children(block["id"])
    for obj in index:
        if obj.get("object") in ("page", "database"):
            save_children(obj["id"])
    print("EXTRACTION_COMPLETE objects=" + str(len(index)) + " block_containers=" + str(len(visited)))
    print("NOTE: this is a read-only metadata/blocks export, not a Gemini connection or full file/database-row backup")

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, urllib.error.URLError) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        sys.exit(1)
