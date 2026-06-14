#!/usr/bin/env bash
# 将 CC Switch / Claude Code 当前供应商切到 Ollama Local（需先退出 CC Switch）。
set -euo pipefail

MODEL="${1:-qwen2.5-coder:14b}"
python3 <<PY
import json, sqlite3, time
from pathlib import Path

home = Path.home()
env = {
    "ANTHROPIC_AUTH_TOKEN": "ollama",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_BASE_URL": "http://localhost:11434",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "$MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "$MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "$MODEL",
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192",
}

db = home / ".cc-switch" / "cc-switch.db"
conn = sqlite3.connect(db)
conn.execute("UPDATE providers SET is_current=0 WHERE app_type='claude'")
conn.execute(
    "UPDATE providers SET is_current=1, settings_config=? WHERE id='ollama-local' AND app_type='claude'",
    (json.dumps({"language": "chinese", "env": env}, ensure_ascii=False),),
)
conn.commit()
conn.close()

cc = json.loads((home / ".cc-switch" / "settings.json").read_text())
cc["currentProviderClaude"] = "ollama-local"
(home / ".cc-switch" / "settings.json").write_text(json.dumps(cc, indent=2, ensure_ascii=False) + "\n")

cs = home / ".claude" / "settings.json"
d = json.loads(cs.read_text()) if cs.exists() else {}
d["language"] = "chinese"
d["env"] = env
cs.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print("已切换到 ollama-local，模型:", "$MODEL")
PY
