@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 需要 Node.js 22 或更新版本：https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo 第一次运行，正在安装依赖…
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo 衡图已启动。在浏览器打开 http://127.0.0.1:8080
echo 关闭此窗口即停止。
call npm run dev
pause
