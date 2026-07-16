@echo off
echo Starting DICOM Viewer Application...

:: Add Node.js and npm to the PATH temporarily
set PATH=C:\Users\IT\Desktop\RIS\node-v22.14.0-win-x64;%PATH%

:: Start the Laravel Backend in a new window
echo Starting Backend...
start "DICOM Backend" cmd.exe /k "cd backend && php artisan serve --host=0.0.0.0"

:: Start the Vite Frontend in a new window (Production Mode for High Performance)
echo Starting Frontend...
start "DICOM Frontend" cmd.exe /k "cd frontend && npm run build && npm run preview"

echo ----------------------------------------------------
echo Backend and Frontend are starting in separate windows.
echo You can close this window once they are running.
echo ----------------------------------------------------
pause
