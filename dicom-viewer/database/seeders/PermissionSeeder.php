<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\RolePermission;

class PermissionSeeder extends Seeder
{
    public static function getPermissionsList(): array
    {
        return [
            // Modul: Pasien & Worklist
            [
                'name' => 'patients.view',
                'label' => 'Lihat Daftar Pasien & Worklist',
                'module' => 'Pasien & Worklist',
                'description' => 'Melihat daftar antrian pasien, status pemeriksaan, dan riwayat studi.',
            ],
            [
                'name' => 'patients.create',
                'label' => 'Registrasi / Tambah Pasien Baru',
                'module' => 'Pasien & Worklist',
                'description' => 'Mendaftarkan data pasien baru secara manual ke dalam sistem RIS.',
            ],
            [
                'name' => 'patients.delete',
                'label' => 'Hapus Pasien & Arsip Studi',
                'module' => 'Pasien & Worklist',
                'description' => 'Menghapus data rekam pasien beserta seluruh arsip citra DICOM terkait.',
            ],

            // Modul: DICOM & Modalitas
            [
                'name' => 'dicom.upload',
                'label' => 'Unggah File DICOM Manual',
                'module' => 'DICOM & Modalitas',
                'description' => 'Mengunggah file citra DICOM dari komputer lokal ke PACS.',
            ],
            [
                'name' => 'dicom.import_router',
                'label' => 'Import DICOM dari Router / Orthanc',
                'module' => 'DICOM & Modalitas',
                'description' => 'Mengimpor file pemeriksaan yang masuk melalui PACS C-STORE Router.',
            ],

            // Modul: Viewer & Ekspertise
            [
                'name' => 'viewer.view',
                'label' => 'Akses Radiology Viewer (Cornerstone & OHIF)',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Membuka dan memvisualisasikan citra medis pada viewport radiologi.',
            ],
            [
                'name' => 'reports.create',
                'label' => 'Tulis & Simpan Draft Ekspertise',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Menulis temuan klinis, kesimpulan, dan menyimpan draft laporan hasil bacaan.',
            ],
            [
                'name' => 'reports.verify',
                'label' => 'Verifikasi & Tanda Tangan Digital',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Menandatangani secara elektronik dan memvalidasi laporan ekspertise menjadi FINAL.',
            ],
            [
                'name' => 'reports.unverify',
                'label' => 'Batalkan Verifikasi / Revisi Ekspertise',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Membuka kembali kunci laporan hasil verifikasi untuk dilakukan perbaikan.',
            ],
            [
                'name' => 'reports.templates',
                'label' => 'Kelola Template / Macro Ekspertise Medis',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Membuat, mengedit, dan menghapus template teks ekspertise terstruktur.',
            ],
            [
                'name' => 'ai.analyze',
                'label' => 'Gunakan Analisis AI Radiologi',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Menjalankan asisten kecerdasan buatan untuk analisis citra radiologi.',
            ],
            [
                'name' => 'voice.dictation',
                'label' => 'Gunakan Dikte Suara Medis',
                'module' => 'Viewer & Ekspertise',
                'description' => 'Menggunakan fitur speech-to-text dictation saat mengetik ekspertise.',
            ],

            // Modul: Kinerja & Mutu (TAT)
            [
                'name' => 'tat.view',
                'label' => 'Akses Dashboard Kinerja TAT',
                'module' => 'Kinerja & Mutu (TAT)',
                'description' => 'Melihat metrik kecepatan turnaround time pembacaan radiologi.',
            ],
            [
                'name' => 'tat.export',
                'label' => 'Ekspor Laporan TAT (CSV / Excel)',
                'module' => 'Kinerja & Mutu (TAT)',
                'description' => 'Mengunduh laporan kepatuhan waktu tunggu radiologi dalam format berkas.',
            ],

            // Modul: Integrasi Eksternal
            [
                'name' => 'integration.view',
                'label' => 'Lihat Log & Status SatuSehat / SIMRS',
                'module' => 'Integrasi Eksternal',
                'description' => 'Melihat status transmisi bridging HL7 FHIR dan billing SIMRS.',
            ],
            [
                'name' => 'integration.manage',
                'label' => 'Ubah Konfigurasi SatuSehat & SIMRS',
                'module' => 'Integrasi Eksternal',
                'description' => 'Mengubah kredensial Client ID, Secret, URL, dan mapping LOINC.',
            ],
            [
                'name' => 'router.view',
                'label' => 'Lihat Pengaturan & Status Router PACS',
                'module' => 'Integrasi Eksternal',
                'description' => 'Melihat konfigurasi port DICOM listener dan statistik transfer.',
            ],
            [
                'name' => 'router.manage',
                'label' => 'Ubah Port, AET, & Storage Router',
                'module' => 'Integrasi Eksternal',
                'description' => 'Mengonfigurasi pengaturan socket SCP C-STORE dan direktori penyimpanan.',
            ],

            // Modul: Administrasi Sistem
            [
                'name' => 'users.view',
                'label' => 'Lihat Daftar Pengguna Sistem',
                'module' => 'Administrasi Sistem',
                'description' => 'Melihat seluruh akun dokter, perawat, dan staf yang terdaftar.',
            ],
            [
                'name' => 'users.create',
                'label' => 'Tambah Akun Pengguna Baru',
                'module' => 'Administrasi Sistem',
                'description' => 'Membuat akun staf baru di sistem RIS/PACS.',
            ],
            [
                'name' => 'users.edit',
                'label' => 'Ubah Data, Sandi & TTD Pengguna',
                'module' => 'Administrasi Sistem',
                'description' => 'Memperbarui profil, reset password, dan mengunggah spesimen tanda tangan.',
            ],
            [
                'name' => 'users.delete',
                'label' => 'Hapus Akun Pengguna',
                'module' => 'Administrasi Sistem',
                'description' => 'Menghapus akses akun staf dari sistem.',
            ],
            [
                'name' => 'permissions.manage',
                'label' => 'Kelola Matriks Hak Akses Peran & User',
                'module' => 'Administrasi Sistem',
                'description' => 'Mengatur hak akses peran bawaan dan override izin individual.',
            ],
            [
                'name' => 'settings.manage',
                'label' => 'Ubah Logo & Nama Aplikasi RS',
                'module' => 'Administrasi Sistem',
                'description' => 'Mengubah identitas rumah sakit, logo, dan nama instansi pada aplikasi.',
            ],
        ];
    }

    public static function getDefaultRoleMappings(): array
    {
        return [
            'doctor' => [
                'patients.view',
                'viewer.view',
                'reports.create',
                'reports.verify',
                'reports.unverify',
                'reports.templates',
                'ai.analyze',
                'voice.dictation',
                'tat.view',
                'tat.export',
            ],
            'radiographer' => [
                'patients.view',
                'patients.create',
                'dicom.upload',
                'dicom.import_router',
                'viewer.view',
                'tat.view',
                'router.view',
            ],
            'nurse' => [
                'patients.view',
                'patients.create',
                'dicom.upload',
                'viewer.view',
            ],
            'superadmin' => [
                // Superadmin inherently has all permissions, but we map them for complete transparency
                'patients.view',
                'patients.create',
                'patients.delete',
                'dicom.upload',
                'dicom.import_router',
                'viewer.view',
                'reports.create',
                'reports.verify',
                'reports.unverify',
                'reports.templates',
                'ai.analyze',
                'voice.dictation',
                'tat.view',
                'tat.export',
                'integration.view',
                'integration.manage',
                'router.view',
                'router.manage',
                'users.view',
                'users.create',
                'users.edit',
                'users.delete',
                'permissions.manage',
                'settings.manage',
            ],
        ];
    }

    public function run(): void
    {
        // 1. Sync permissions
        foreach (self::getPermissionsList() as $item) {
            Permission::updateOrCreate(
                ['name' => $item['name']],
                [
                    'label' => $item['label'],
                    'module' => $item['module'],
                    'description' => $item['description'],
                ]
            );
        }

        // 2. Sync role permissions defaults
        $roles = self::getDefaultRoleMappings();
        foreach ($roles as $role => $permNames) {
            foreach ($permNames as $permName) {
                $perm = Permission::where('name', $permName)->first();
                if ($perm) {
                    RolePermission::firstOrCreate([
                        'role' => $role,
                        'permission_id' => $perm->id,
                    ]);
                }
            }
        }
    }
}
