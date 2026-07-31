# Panduan Deployment RIS (Radiology Information System)

Aplikasi ini sekarang menggunakan struktur **Monolithic/Unified Deployment**. Artinya, aplikasi Frontend (React) sudah digabungkan secara permanen ke dalam folder Backend (Laravel). Anda tidak perlu lagi menyalakan terminal `npm run dev` untuk menjalankan React.

## Persiapan Aplikasi (Server Production)

Pastikan server produksi Anda (baik Windows maupun Linux) sudah terinstall:
- PHP >= 8.2
- Composer
- Database MySQL / MariaDB (Contoh: menggunakan XAMPP atau Laragon)

## Langkah-langkah Menjalankan Aplikasi

1. **Masuk ke folder backend:**
   Gunakan terminal atau command prompt, arahkan ke folder `dicom-viewer/backend`.

2. **Atur Environment (Koneksi Database):**
   - Pastikan file `.env` di dalam folder `backend` sudah diisi dengan kredensial database server Anda.
   - Ubah `APP_ENV=local` menjadi `APP_ENV=production`.
   - Ubah `APP_DEBUG=true` menjadi `APP_DEBUG=false` untuk keamanan.

3. **Install Dependensi & Optimasi Kecepatan:**
   Jalankan perintah berikut di dalam terminal `backend` untuk mengunci dan mempercepat kinerja Laravel:
   ```bash
   composer install --optimize-autoloader --no-dev
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

4. **Jalankan Server:**
   Jika Anda menggunakan XAMPP/IIS/Laragon, arahkan **Document Root** dari web server Anda ke folder `dicom-viewer/backend/public`. 
   
   Jika ingin mencoba menjalankan secara instan (tanpa web server tambahan), jalankan:
   ```bash
   php artisan serve --host=0.0.0.0 --port=80
   ```
   Lalu akses melalui Browser menggunakan IP Komputer/Server Anda (contoh: `http://192.168.0.100`).

## Catatan Penting
Meskipun aplikasi sudah tergabung, namun untuk memaksimalkan fitur **Import DICOM**, pastikan sistem di komputer/server ini mengizinkan perintah `net use` untuk mengambil data DICOM dari jaringan.
