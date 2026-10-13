#!/usr/bin/env python3
"""Build the synthetic, self-contained portfolio site."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def main():
    skeleton = (ROOT / "src" / "guest-skeleton.html").read_text()
    data = (ROOT / "src" / "demo-data.js").read_text()
    app = (ROOT / "src" / "guest-app.js").read_text()
    banner_css = """
.portfolio-demo-banner{position:relative;z-index:1000;padding:9px 16px;text-align:center;background:#071c35;color:#f6fbff;font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.02em}
"""
    skeleton = skeleton.replace("</style>", banner_css + "\n</style>")
    output, count = re.subn(
        r"<script>\s*</script>",
        lambda _: "<script>\n" + data + "\n\n" + app + "\n</script>",
        skeleton,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Expected exactly one empty script placeholder")
    site = ROOT / "site"
    site.mkdir(exist_ok=True)
    (site / "index.html").write_text(output)
    subprocess.run(["python3", str(ROOT / "build" / "privacy_check.py")], check=True)
    print(f"Built {site / 'index.html'} ({len(output):,} bytes)")


if __name__ == "__main__":
    main()
