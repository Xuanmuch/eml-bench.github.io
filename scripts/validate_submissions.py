#!/usr/bin/env python3
"""Validate JSON files under submissions/incoming/ against submissions/entry.schema.json.

Uses stdlib only (no jsonschema package). Exit 1 on first error.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INCOMING = ROOT / "submissions" / "incoming"
SCHEMA_PATH = ROOT / "submissions" / "entry.schema.json"

ID_RE = re.compile(r"^[a-z0-9_]+$")
VERIFIED_OK = {"seed", "pr", "pending"}
LINEAGE_OK = {"baseline", "community"}


def err(msg: str) -> None:
    print(msg, file=sys.stderr)


def validate_entry(obj: object, path: Path) -> bool:
    if not isinstance(obj, dict):
        err(f"{path}: root must be a JSON object")
        return False
    req = ["id", "source_wl", "eml", "metrics", "verified"]
    for k in req:
        if k not in obj:
            err(f"{path}: missing required key {k!r}")
            return False
    eid = obj["id"]
    if not isinstance(eid, str) or not ID_RE.match(eid):
        err(f"{path}: id must match ^[a-z0-9_]+$")
        return False
    for k in ("source_wl", "eml"):
        if not isinstance(obj[k], str) or not obj[k].strip():
            err(f"{path}: {k} must be a non-empty string")
            return False
    v = obj["verified"]
    if not isinstance(v, str) or v not in VERIFIED_OK:
        err(f"{path}: verified must be one of {sorted(VERIFIED_OK)}")
        return False
    if "lineage" in obj and obj["lineage"] not in LINEAGE_OK:
        err(f"{path}: lineage must be one of {sorted(LINEAGE_OK)}")
        return False
    m = obj["metrics"]
    if not isinstance(m, dict):
        err(f"{path}: metrics must be an object")
        return False
    for mk in ("char_len", "eml_node_count", "max_bracket_depth"):
        if mk not in m:
            err(f"{path}: metrics missing {mk!r}")
            return False
        if not isinstance(m[mk], int) or m[mk] < 1:
            err(f"{path}: metrics.{mk} must be integer >= 1")
            return False
    return True


def main() -> int:
    if not INCOMING.is_dir():
        err(f"Missing directory: {INCOMING}")
        return 1
    files = sorted(INCOMING.glob("*.json"))
    if not files:
        print("No JSON files in submissions/incoming/ — skip validation.")
        return 0
    if not SCHEMA_PATH.is_file():
        err(f"Schema missing: {SCHEMA_PATH}")
        return 1
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
            obj = json.loads(text)
        except json.JSONDecodeError as e:
            err(f"{path}: invalid JSON: {e}")
            return 1
        if not validate_entry(obj, path):
            return 1
        print("OK", path.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
