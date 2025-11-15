@echo off
chcp 65001 >nul
title 停止数学作业批改系统

echo.
echo ================================================
echo     停止数学作业批改系统
echo ================================================
echo.

:: 查找占用端口3007的进程
echo 正在查找服务器进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3007"') do (
    set PID=%%a
    goto :found
)

:found
if defined PID (
    echo 找到服务器进程，PID: %PID%
    echo.
    echo 正在停止服务器...
    taskkill /PID %PID% /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ 服务器已成功停止
    ) else (
        echo ❌ 停止失败，可能进程已自动结束
    )
) else (
    echo ℹ️  未找到运行中的服务器进程
)

echo.
echo 清理完成
pause