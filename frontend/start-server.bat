@echo off
cd /d "%~dp0"
echo.
echo  Frontend: http://localhost:8080/login.html
echo  Backend API must be running (e.g. http://localhost:8000)
echo  Press Ctrl+C to stop.
echo.
python -m http.server 8080
