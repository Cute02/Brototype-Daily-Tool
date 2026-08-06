@echo off
title Brototype Daily Tool Server
echo ===================================================
echo Starting Brototype Daily Tool REST & Web Server...
echo ===================================================
echo.
echo Server running at: http://localhost:8000
echo Press Ctrl+C to stop the server.
echo.
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python server exited with error. Trying 'py server.py'...
    py server.py
)
pause
