@echo off
echo Starting DICOM Viewer Application...


:: Start the Laravel Backend in a new window
echo Starting Backend...
start "DICOM Backend" cmd.exe /k "cd backend && php artisan serve --host=0.0.0.0 --port=8001"

:: Start the Vite Frontend in a new window (Production Mode for High Performance)
echo Starting Frontend...
start "DICOM Frontend" cmd.exe /k "cd frontend && npm run build && npm run preview"

echo ----------------------------------------------------
echo Backend and Frontend are starting in separate windows.
echo You can close this window once they are running.
echo ----------------------------------------------------
pause
