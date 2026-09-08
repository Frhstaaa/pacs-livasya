@echo off
echo Membuka Akses Firewall untuk DICOM Viewer (Monorepo)...
echo Memerlukan akses Administrator.

netsh advfirewall firewall add rule name="Vite Dev Server (Port 5173-5175)" dir=in action=allow protocol=TCP localport=5173-5175
netsh advfirewall firewall add rule name="Laravel Dev Server (Port 8000-8005)" dir=in action=allow protocol=TCP localport=8000-8005

echo.
echo Selesai! Jika tidak ada pesan error merah di atas, berarti firewall sudah terbuka.
echo Silakan coba akses kembali aplikasinya dari perangkat lain.
pause
