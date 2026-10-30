#!/usr/bin/env python3
"""Fail the public build if personal-project markers or risky data appear."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parent.parent
APP_INSIGHTS_SDK_SHA256 = "69520f805c4960a5a1380ea67453667ab41e8afd4a4e21a8a9ae181edb93859a"
FILES = [
    ROOT / "src" / "demo-data.js",
    ROOT / "site" / "index.html",
    ROOT / "site" / "app.js",
    ROOT / "site" / "styles.css",
    ROOT / "site" / "telemetry.js",
]
FORBIDDEN = {
    "phone number": re.compile(r"(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)"),
    "email address": re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I),
    "non-example street address": re.compile(r"\b\d{1,5}\s+(?!Example\b)[A-Z][A-Za-z.' -]+\s(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd)\b"),
}

findings = []
for sdk_path in (
    ROOT / "src" / "vendor" / "applicationinsights-web.min.js",
    ROOT / "site" / "applicationinsights-web.min.js",
):
    if hashlib.sha256(sdk_path.read_bytes()).hexdigest() != APP_INSIGHTS_SDK_SHA256:
        findings.append(f"{sdk_path.relative_to(ROOT)}: unreviewed Application Insights SDK build")

for path in FILES:
    text = path.read_text()
    for label, pattern in FORBIDDEN.items():
        if pattern.search(text):
            findings.append(f"{path.relative_to(ROOT)}: {label}")

if findings:
    raise SystemExit("Privacy check failed:\n- " + "\n- ".join(findings))
print(f"Privacy check passed for {len(FILES)} public artifacts")
