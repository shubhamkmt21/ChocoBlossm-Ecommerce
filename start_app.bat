@echo off
echo Starting Choco Blossom India Ecosystem...
echo -----------------------------------------

:: 1. Start Django Service (Analytics) in background
echo [1/3] Starting Analytics Service (Django Port 8000)...
start "Django Analytics" /min cmd /k "cd services\analytics_service && python manage.py runserver 8000"

:: 2. Start Node.js Core Service (Storefront + API)
echo [2/3] Starting Core Service (Node.js Port 3000)...
start "Node.js Core" /min cmd /k "node server.js"

:: 3. Wait for servers to warm up
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

:: 4. Open Browser
echo [3/3] Launching Website...
start http://localhost:3000

echo.
echo ====================================================
echo   CHOCO BLOSSOM IS LIVE! 🍫
echo   Storefront: http://localhost:3000
echo   Analytics:  http://localhost:8000/admin
echo ====================================================
echo.
pause
