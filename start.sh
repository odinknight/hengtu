#!/bin/sh
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "需要 Node.js 22 或更新版本：https://nodejs.org"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "第一次运行，正在安装依赖…"
  npm install || exit 1
fi

echo "衡图已启动。在浏览器打开 http://127.0.0.1:8080"
echo "按 Ctrl+C 停止。"
exec npm run dev
