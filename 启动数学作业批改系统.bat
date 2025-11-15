@echo off
chcp 65001 >nul
title 数学作业批改系统 - 一键启动

echo.
echo ================================================
echo     数学作业批改系统 - 一键启动程序
echo ================================================
echo.

:: 检查Node.js是否安装
echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js，请先安装Node.js
    echo    下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js版本: %NODE_VERSION%

:: 检查npm是否可用
echo.
echo [2/5] 检查npm包管理器...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm不可用，请重新安装Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm版本: %NPM_VERSION%

:: 检查是否在项目目录
echo.
echo [3/5] 检查项目目录...
if not exist "package.json" (
    echo ❌ 未找到package.json文件
    echo    请确保在项目根目录下运行此脚本
    pause
    exit /b 1
)
echo ✅ 项目目录正确

:: 检查node_modules是否存在
echo.
echo [4/5] 检查依赖包...
if not exist "node_modules" (
    echo ⚠️  首次运行，正在安装依赖包...
    echo    这可能需要几分钟时间，请耐心等待...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖包已存在
)

:: 检查端口3007是否被占用
echo.
echo [5/5] 检查端口状态...
netstat -ano | findstr ":3007" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口3007已被占用
    echo    可能服务器已在运行中
    echo.
    echo 是否要继续启动？(可能发生端口冲突)
    echo 按 Y 继续，或按 N 退出
    set /p choice="请选择 [Y/N]: "
    if /i "%choice%" neq "Y" (
        echo.
        echo 启动已取消
        pause
        exit /b 1
    )
    echo.
)

:: 启动服务器
echo.
echo ================================================
echo 服务器启动中，请稍候...
echo 访问地址: http://localhost:3007
echo 按 Ctrl+C 可停止服务器
echo ================================================
echo.

:: 使用PowerShell启动服务器，避免窗口闪烁问题
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/k','title','服务器 && npm start' -WindowStyle Normal"

:: 等待5秒让服务器启动
echo 正在等待服务器启动...
timeout /t 5 /nobreak >nul

:: 检查服务器是否成功启动
netstat -ano | findstr ":3007" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 服务器已成功启动！
    echo.
    echo 正在打开浏览器...
    start http://localhost:3007
) else (
    echo ⚠️  服务器可能启动较慢，尝试手动打开浏览器...
    echo    请访问: http://localhost:3007
    start http://localhost:3007
)

echo.
echo ================================================
echo ✅ 启动完成！
echo ================================================
echo.
echo 📝 使用说明:
echo    1. 服务器正在运行中
echo    2. 浏览器应已自动打开应用页面
echo    3. 如果浏览器未自动打开，请手动访问:
echo       http://localhost:3007
echo    4. 如需停止服务器，请关闭所有相关命令行窗口
echo.
pause