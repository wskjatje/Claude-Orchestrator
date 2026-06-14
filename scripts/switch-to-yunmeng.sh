#!/usr/bin/env bash
# 将 CC Switch / Claude Code 当前供应商切到「云梦 AI」（需先运行 setup-yunmeng-cc-switch.sh）。
set -euo pipefail

export YUNMENG_MODEL="${1:-${YUNMENG_MODEL:-claude-sonnet-4-20250514}}"
export YUNMENG_BASE_URL="${YUNMENG_BASE_URL:-https://api.yunmengai.top}"
export YUNMENG_BASE_URL="${YUNMENG_BASE_URL%/}"

python3 <<'PY'
import json
import os
import sqlite3
from pathlib import Path

home = Path.home()
model = os.environ["YUNMENG_MODEL"]
base = os.environ["YUNMENG_BASE_URL"].rstrip("/")

db = home / ".cc-switch" / "cc-switch.db"
if not db.exists():
    raise SystemExit("未找到 CC Switch DB，请先运行 ./scripts/setup-yunmeng-cc-switch.sh")

conn = sqlite3.connect(db)
row = conn.execute(
    "SELECT settings_config FROM providers WHERE id='yunmeng-claude' AND app_type='claude'"
).fetchone()
if not row:
    raise SystemExit("未找到 yunmeng-claude 供应商，请先运行 ./scripts/setup-yunmeng-cc-switch.sh")

cfg = json.loads(row[0] or "{}")
env = dict(cfg.get("env") or {})
env["ANTHROPIC_BASE_URL"] = base
env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = model
env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = model
env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = model
env.setdefault("CLAUDE_CODE_MAX_OUTPUT_TOKENS", "8192")
env.setdefault("CLAUDE_CODE_DISABLE_1M_CONTEXT", "1")
settings = {"language": "chinese", "env": env}

conn.execute("UPDATE providers SET is_current=0 WHERE app_type='claude'")
conn.execute(
    "UPDATE providers SET is_current=1, settings_config=? WHERE id='yunmeng-claude' AND app_type='claude'",
    (json.dumps(settings, ensure_ascii=False),),
)
conn.commit()
conn.close()

cc = home / ".cc-switch" / "settings.json"
cc_data = json.loads(cc.read_text()) if cc.exists() else {}
cc_data["currentProviderClaude"] = "yunmeng-claude"
cc.write_text(json.dumps(cc_data, indent=2, ensure_ascii=False) + "\n")

cs = home / ".claude" / "settings.json"
d = json.loads(cs.read_text()) if cs.exists() else {}
d["$schema"] = "https://json.schemastore.org/claude-code-settings.json"
d["language"] = "chinese"
d["env"] = env
cs.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("已切换到 yunmeng-claude，模型:", model)
print("BASE_URL:", base)
print("请运行: npm run sync:cc-switch && 重启 Web Bridge")
PY
