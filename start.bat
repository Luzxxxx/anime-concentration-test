@echo off
chcp 65001 >nul
echo ============================================
echo     二次元浓度研究所 · 樱花街机学院版
echo ============================================
echo.
echo 正在启动本地服务器...
echo.

:: 尝试使用 Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server 8080
    goto :end
)

:: 尝试使用 Python
py --version >nul 2>&1
if %errorlevel% equ 0 (
    py -m http.server 8080
    goto :end
)

:: 尝试使用 Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    node server.js
    goto :end
)

:: 都不行
echo ============================================
echo 错误：未找到 Python 或 Node.js
echo.
echo 请安装以下任一工具：
echo 1. Python 3.x：https://python.org
echo 2. Node.js：https://nodejs.org
echo ============================================
pause

:end
