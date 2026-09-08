@echo off
cd /d "%~dp0"
title DICOM Viewer Launcher

echo ========================================================
echo Memulai DICOM Viewer Application (Monorepo)
echo ========================================================
echo.

:: Start Laravel Backend Server on Port 8005
echo [1/2] Menjalankan Laravel Server (Port 8005)...
start "DICOM - Laravel Server (Port 8005)" cmd.exe /k "cd /d ""%~dp0"" && php artisan serve --host=0.0.0.0 --port=8005"

:: Start Vite Development Server on Port 5174
echo [2/2] Menjalankan Vite Dev Server (Port 5174)...
start "DICOM - Vite Server (Port 5174)" cmd.exe /k "cd /d ""%~dp0"" && call npm.cmd run dev"

echo.
echo --------------------------------------------------------
echo Server aktif dan siap digunakan!
echo.
echo Silakan buka browser di:
echo    👉 http://localhost:8005
echo.
echo Akses dari LAN / Jaringan:
echo    👉 http://[IP-KOMPUTER]:8005
echo --------------------------------------------------------
echo.
pause
