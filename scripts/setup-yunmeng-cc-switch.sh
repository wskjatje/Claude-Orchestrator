#!/usr/bin/env bash
# 通过 CC Switch 深链接导入 Claude Code → 云梦 AI（Anthropic 兼容 API）
#
# 用法（勿把 key 写进仓库）：
#   YUNMENG_API_KEY='sk-...' ./scripts/setup-yunmeng-cc-switch.sh
#   YUNMENG_API_KEY='sk-...' YUNMENG_MODEL='claude-sonnet-4-20250514' ./scripts/setup-yunmeng-cc-switch.sh
#
# 可选环境变量：
#   YUNMENG_BASE_URL   默认 https://api.yunmengai.top（Claude Code 用域名根，勿加 /v1）
#   YUNMENG_HOMEPAGE   默认 https://ai.yunmengai.top
set -euo pipefail

YUNMENG_API_KEY="${YUNMENG_API_KEY:-}"
BASE_URL="${YUNMENG_BASE_URL:-https://api.yunmengai.top}"
HOMEPAGE="${YUNMENG_HOMEPAGE:-https://ai.yunmengai.top}"
MODEL="${YUNMENG_MODEL:-claude-sonnet-4-20250514}"

if [[ -z "${YUNMENG_API_KEY}" ]]; then
  echo "请设置环境变量 YUNMENG_API_KEY（在云梦控制台 → API 设置 获取）" >&2
  echo "示例: YUNMENG_API_KEY='sk-...' $0" >&2
  exit 1
fi

echo "==> 检查 CC Switch..."
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ ! -d "/Applications/CC Switch.app" ]]; then
    echo "未找到 CC Switch.app，请安装: https://ccswitch.io 或 brew install --cask cc-switch" >&2
    exit 1
  fi
fi

echo "==> 检查 Claude Code..."
if ! command -v claude >/dev/null 2>&1; then
  echo "未找到 claude CLI。推荐: brew install --cask claude-code" >&2
  exit 1
fi
claude --version

DEEPLINK=$(YUNMENG_API_KEY="${YUNMENG_API_KEY}" MODEL="${MODEL}" BASE_URL="${BASE_URL}" HOMEPAGE="${HOMEPAGE}" python3 <<'PY'
import os
import urllib.parse

model = os.environ["MODEL"]
base = os.environ["BASE_URL"].rstrip("/")
home = os.environ["HOMEPAGE"]
key = os.environ["YUNMENG_API_KEY"]
query = urllib.parse.urlencode(
    {
        "resource": "provider",
        "app": "claude",
        "name": "云梦 AI",
        "homepage": home,
        "endpoint": base,
        "apiKey": key,
        "model": model,
        "haikuModel": model,
        "sonnetModel": model,
        "opusModel": model,
        "icon": "custom",
        "enabled": "false",
        "notes": "云梦 AI 聚合站 Anthropic 兼容；模型 ID 以控制台为准",
    }
)
print(f"ccswitch://v1/import?{query}")
PY
)

echo ""
echo "即将在 CC Switch 中导入供应商「云梦 AI」"
echo "  模型: ${MODEL}"
echo "  端点: ${BASE_URL}"
echo "  官网: ${HOMEPAGE}"
echo ""

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "${DEEPLINK}" || open -a "CC Switch" "${DEEPLINK}"
else
  echo "请手动在 CC Switch 中使用此链接："
  echo "${DEEPLINK}"
fi

# 同时写入 DB（固定 id yunmeng-claude），便于脚本切换
YUNMENG_API_KEY="${YUNMENG_API_KEY}" MODEL="${MODEL}" BASE_URL="${BASE_URL}" HOMEPAGE="${HOMEPAGE}" python3 <<'PY'
import json
import sqlite3
import time
from pathlib import Path

home = Path.home()
key = __import__("os").environ["YUNMENG_API_KEY"]
model = __import__("os").environ["MODEL"]
base = __import__("os").environ["BASE_URL"].rstrip("/")
site = __import__("os").environ["HOMEPAGE"]

env = {
    "ANTHROPIC_API_KEY": key,
    "ANTHROPIC_AUTH_TOKEN": key,
    "ANTHROPIC_BASE_URL": base,
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": model,
    "ANTHROPIC_DEFAULT_SONNET_MODEL": model,
    "ANTHROPIC_DEFAULT_OPUS_MODEL": model,
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192",
    "LANG": "zh_CN.UTF-8",
    "LC_ALL": "zh_CN.UTF-8",
}
settings = {"language": "chinese", "env": env}
cfg = json.dumps(settings, ensure_ascii=False)

db = home / ".cc-switch" / "cc-switch.db"
conn = sqlite3.connect(db)
now = int(time.time() * 1000)
existing = conn.execute(
    "SELECT id FROM providers WHERE id='yunmeng-claude' AND app_type='claude'"
).fetchone()
if existing:
    conn.execute(
        """UPDATE providers SET name=?, settings_config=?, website_url=?, category=?, notes=?, icon=?
           WHERE id='yunmeng-claude' AND app_type='claude'""",
        (
            "云梦 AI",
            cfg,
            site,
            "third_party",
            "云梦 AI 聚合站；切换: ./scripts/switch-to-yunmeng.sh",
            "custom",
        ),
    )
else:
    conn.execute(
        """INSERT INTO providers
           (id, app_type, name, settings_config, website_url, category, created_at, sort_index, notes, icon, icon_color, meta, is_current, in_failover_queue, cost_multiplier)
           VALUES (?, 'claude', ?, ?, ?, 'third_party', ?, 110, ?, 'custom', '#6366f1', '{}', 0, 0, '1.0')""",
        ("yunmeng-claude", "云梦 AI", cfg, site, now, "云梦 AI 聚合站"),
    )
conn.commit()
conn.close()
print("已写入 CC Switch DB：provider id = yunmeng-claude")
PY

cat <<EOF

请在 CC Switch 弹窗中「确认导入」（若已弹出）。

下一步（启用并同步 Web 界面）：
  ./scripts/switch-to-yunmeng.sh ${MODEL}
  npm run sync:cc-switch

使用步骤：
  1. CC Switch → Claude Code → 启用「云梦 AI」
  2. 终端: claude --model sonnet -p "你好" --tools "" < /dev/null
  3. Web: 刷新浏览器，顶部应显示当前模型

模型 ID 以云梦控制台为准，可通过环境变量覆盖：
  YUNMENG_MODEL='你的模型ID' ./scripts/setup-yunmeng-cc-switch.sh

详细说明见 docs/setup-ollama-cc-switch.md § 云梦 AI
EOF
