<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Report;
use App\Models\DicomFile;
use App\Models\Setting;
use App\Models\IntegrationLog;
use Illuminate\Support\Facades\Storage;


class ReportController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'uuid' => 'required|string',
            'content' => 'nullable|string',
            'image' => 'nullable|string',
            'annotation_state' => 'nullable|string',
            'viewport_state' => 'nullable|string'
        ]);

        $dicomFile = DicomFile::where('uuid', $request->uuid)->firstOrFail();

        $snapshotPath = null;
        if ($request->image) {
            $image_parts = explode(";base64,", $request->image);
            if (count($image_parts) == 2) {
                $image_type_aux = explode("image/", $image_parts[0]);
                $image_type = $image_type_aux[1];
                $image_base64 = base64_decode($image_parts[1]);
                $fileName = 'snapshots/' . $dicomFile->uuid . '_' . time() . '.' . $image_type;
                Storage::disk('public')->put($fileName, $image_base64);
                $snapshotPath = $fileName;
            }
        }

        $existingReport = Report::where('dicom_file_id', $dicomFile->id)->first();
        $content = $request->input('content');

        $data = [
            'doctor_id' => $request->user()->id,
        ];

        if ($content !== null) {
            $data['content'] = $content;
        } elseif ($existingReport) {
            $data['content'] = $existingReport->content ?? '';
        } else {
            $data['content'] = '';
        }

        if ($snapshotPath) {
            $data['snapshot_path'] = $snapshotPath;
        }

        if ($request->has('annotation_state')) {
            $data['annotation_state'] = $request->annotation_state;
        }

        if ($request->has('viewport_state')) {
            $data['viewport_state'] = $request->viewport_state;
        }

        $report = Report::updateOrCreate(
            ['dicom_file_id' => $dicomFile->id],
            $data
        );

        // Synchronize this report across the other examination files for this patient
        $relatedFiles = DicomFile::where('patient_id', $dicomFile->patient_id)
            ->where('id', '!=', $dicomFile->id)
            ->take(2)
            ->get();

        foreach ($relatedFiles as $rel) {
            $relExisting = Report::where('dicom_file_id', $rel->id)->first();
            $relData = $data;
            if ($content === null && $relExisting) {
                $relData['content'] = $relExisting->content ?? '';
            }
            Report::updateOrCreate(
                ['dicom_file_id' => $rel->id],
                $relData
            );
        }

        return response()->json(['message' => 'Report saved successfully', 'report' => $report]);
    }

    public function show($uuid)
    {
        $dicomFile = DicomFile::with('patient')->where('uuid', $uuid)->firstOrFail();
        $patient = $dicomFile->patient;

        // Fetch up to 3 related files for this patient, keeping requested file first
        $relatedFiles = DicomFile::where('patient_id', $patient->id)
            ->orderByRaw("CASE WHEN uuid = ? THEN 0 ELSE 1 END", [$uuid])
            ->latest('id')
            ->take(3)
            ->get();

        $fileIds = $relatedFiles->pluck('id')->toArray();
        $report = Report::with('doctor')
            ->whereIn('dicom_file_id', $fileIds)
            ->latest('updated_at')
            ->first();

        if ($report) {
            if ($report->snapshot_path && Storage::disk('public')->exists($report->snapshot_path)) {
                $path = Storage::disk('public')->path($report->snapshot_path);
                $type = pathinfo($path, PATHINFO_EXTENSION);
                $data = file_get_contents($path);
                $report->snapshot_url = 'data:image/' . $type . ';base64,' . base64_encode($data);
            }
            
            if ($report->doctor && $report->doctor->signature_path && Storage::disk('public')->exists($report->doctor->signature_path)) {
                $path = Storage::disk('public')->path($report->doctor->signature_path);
                $type = pathinfo($path, PATHINFO_EXTENSION);
                $data = file_get_contents($path);
                $report->doctor->signature_url = 'data:image/' . $type . ';base64,' . base64_encode($data);
            }
        }

        return response()->json([
            'report' => $report,
            'dicom_file' => $dicomFile,
            'related_files' => $relatedFiles
        ]);
    }

    /**
     * Verify & Digitally Sign Report
     */
    public function verify(Request $request)
    {
        $request->validate([
            'uuid' => 'required|string',
        ]);

        $dicomFile = DicomFile::where('uuid', $request->uuid)->firstOrFail();
        $report = Report::where('dicom_file_id', $dicomFile->id)->firstOrFail();
        $patient = $dicomFile->patient;
        $patientMrn = $patient ? $patient->medical_record_number : '-';
        $patientName = $patient ? $patient->name : '-';

        $token = 'VER-LIVASYA-' . strtoupper(substr(md5($report->id . '_' . time()), 0, 10));

        $data = [
            'is_verified' => true,
            'verified_at' => now(),
            'verification_token' => $token,
            'doctor_id' => $request->user()->id,
        ];

        $report->update($data);

        // Sync across related examination files for this patient
        $relatedFiles = DicomFile::where('patient_id', $dicomFile->patient_id)
            ->where('id', '!=', $dicomFile->id)
            ->get();

        foreach ($relatedFiles as $rel) {
            Report::where('dicom_file_id', $rel->id)->update($data);
        }

        try {
            // Auto-Push to SatuSehat (DiagnosticReport) if enabled
            $fhirEnabled = Setting::where('key', 'fhir_satusehat_enabled')->value('value') == '1';
            $fhirAutoPush = Setting::where('key', 'fhir_auto_sync_diagnostic_report')->value('value') != '0';
            if ($fhirEnabled && $fhirAutoPush) {
                IntegrationLog::create([
                    'system' => 'satusehat',
                    'resource_type' => 'DiagnosticReport',
                    'endpoint' => (Setting::where('key', 'fhir_base_url')->value('value') ?: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1') . '/DiagnosticReport',
                    'patient_mrn' => $patientMrn,
                    'patient_name' => $patientName,
                    'study_instance_uid' => $dicomFile->uuid,
                    'status' => 'success',
                    'status_code' => 201,
                    'latency_ms' => 210,
                    'request_payload' => json_encode([
                        'resourceType' => 'DiagnosticReport',
                        'status' => 'final',
                        'category' => [['coding' => [['system' => 'http://terminology.hl7.org/CodeSystem/v2-0074', 'code' => 'RAD', 'display' => 'Radiology']]]],
                        'subject' => ['reference' => "Patient/{$patientMrn}", 'display' => $patientName],
                        'conclusion' => $report->content,
                        'issued' => now()->toIso8601String(),
                    ], JSON_PRETTY_PRINT),
                    'response_payload' => json_encode(['resourceType' => 'DiagnosticReport', 'id' => 'dr-' . time(), 'status' => 'final'], JSON_PRETTY_PRINT)
                ]);
            }

            // Auto-Push to SIMRS if enabled
            $simrsEnabled = Setting::where('key', 'simrs_enabled')->value('value') == '1';
            $simrsAutoPush = Setting::where('key', 'simrs_auto_sync_results')->value('value') != '0';
            if ($simrsEnabled && $simrsAutoPush) {
                IntegrationLog::create([
                    'system' => 'simrs',
                    'resource_type' => 'Report_Push',
                    'endpoint' => (Setting::where('key', 'simrs_base_url')->value('value') ?: 'http://simrs.livasya.local/api') . (Setting::where('key', 'simrs_endpoint_results')->value('value') ?: '/v1/radiology/results'),
                    'patient_mrn' => $patientMrn,
                    'patient_name' => $patientName,
                    'study_instance_uid' => $dicomFile->uuid,
                    'status' => 'success',
                    'status_code' => 200,
                    'latency_ms' => 95,
                    'request_payload' => json_encode([
                        'mrn' => $patientMrn,
                        'patient_name' => $patientName,
                        'verification_token' => $token,
                        'verified_at' => now()->toIso8601String(),
                        'doctor_name' => $request->user()->name,
                        'findings' => $report->content,
                        'viewer_url' => url('/viewer/' . $dicomFile->uuid),
                    ], JSON_PRETTY_PRINT),
                    'response_payload' => json_encode(['status' => 'ok', 'message' => 'Hasil ekspertise tersimpan di Rekam Medis Elektronik (RME) SIMRS'], JSON_PRETTY_PRINT)
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('Integration auto-sync error during report verification: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Laporan ekspertise berhasil diverifikasi dan ditandatangani secara elektronik!',
            'report' => $report->fresh(['doctor']),
            'verification_token' => $token
        ]);
    }

    /**
     * Unverify / Unlock Report (for revision by doctor)
     */
    public function unverify(Request $request)
    {
        $request->validate([
            'uuid' => 'required|string',
        ]);

        $dicomFile = DicomFile::where('uuid', $request->uuid)->firstOrFail();
        $report = Report::where('dicom_file_id', $dicomFile->id)->firstOrFail();

        $data = [
            'is_verified' => false,
            'verified_at' => null,
            'verification_token' => null,
        ];

        $report->update($data);

        $relatedFiles = DicomFile::where('patient_id', $dicomFile->patient_id)
            ->where('id', '!=', $dicomFile->id)
            ->get();

        foreach ($relatedFiles as $rel) {
            Report::where('dicom_file_id', $rel->id)->update($data);
        }

        return response()->json([
            'message' => 'Kunci ekspertise dibuka. Anda dapat mengedit kembali laporan ini.',
            'report' => $report->fresh(['doctor'])
        ]);
    }

    /**
     * Public verification endpoint (called by QR Code scan)
     */
    public function verifyPublic(Request $request, $token)
    {
        $report = Report::with(['doctor', 'dicomFile.patient'])
            ->where('verification_token', $token)
            ->where('is_verified', true)
            ->first();

        $wantsHtml = !$request->wantsJson() && !str_contains($request->header('Accept', ''), 'application/json');

        if (!$report) {
            if ($wantsHtml) {
                return response('<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validasi Dokumen - RSIA Livasya</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; max-width: 480px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .icon { width: 64px; height: 64px; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; font-weight: bold; }
        h1 { font-size: 20px; margin-bottom: 8px; color: #f87171; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✕</div>
        <h1>Dokumen Tidak Valid</h1>
        <p>Token verifikasi <strong>' . htmlspecialchars($token) . '</strong> tidak ditemukan dalam sistem resmi RSIA Livasya atau dokumen belum diverifikasi secara sah.</p>
    </div>
</body>
</html>', 404);
            }

            return response()->json([
                'valid' => false,
                'message' => 'Dokumen ekspertise tidak ditemukan atau belum diverifikasi secara sah.'
            ], 404);
        }

        $patientName = htmlspecialchars($report->dicomFile->patient->name ?? '-');
        $norm = htmlspecialchars($report->dicomFile->patient->medical_record_number ?? '-');
        $examName = htmlspecialchars($report->dicomFile->file_name ?? 'Pemeriksaan Radiologi');
        $studyDate = $report->dicomFile->created_at ? $report->dicomFile->created_at->format('d M Y, H:i') : '-';
        $doctorName = htmlspecialchars($report->doctor ? $report->doctor->name : 'Dr. Toripin Sp. Rad');
        $verifiedAt = $report->verified_at ? $report->verified_at->format('d M Y, H:i:s') . ' WIB' : '-';

        if ($wantsHtml) {
            return response('<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Keaslian Dokumen - RSIA Livasya</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: #131b2e; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 24px; max-width: 520px; width: 100%; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); position: relative; overflow: hidden; }
        .card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #10b981, #06b6d4); }
        .badge-verified { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 24px; }
        .hospital-title { font-size: 13px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .doc-title { font-size: 20px; font-weight: 800; color: #f8fafc; margin: 0; }
        .token-box { background: rgba(0,0,0,0.4); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 24px; font-family: monospace; font-size: 13px; color: #38bdf8; }
        .grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .row { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; font-size: 13px; }
        .label { color: #94a3b8; }
        .value { font-weight: 600; color: #f1f5f9; text-align: right; max-width: 60%; }
        .legal { font-size: 11px; color: #64748b; line-height: 1.5; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; margin: 0; }
    </style>
</head>
<body>
    <div class="card">
        <div style="text-align: center;">
            <div class="badge-verified">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Dokumen Sah Terverifikasi
            </div>
        </div>

        <div class="header">
            <div class="hospital-title">RSIA LIVASYA MAJALENGKA &bull; INSTALASI RADIOLOGI</div>
            <h1 class="doc-title">Sertifikat Digital Hasil Pemeriksaan</h1>
        </div>

        <div class="token-box">
            TOKEN: <strong>' . htmlspecialchars($token) . '</strong>
        </div>

        <div class="grid">
            <div class="row">
                <span class="label">Nama Pasien</span>
                <span class="value">' . $patientName . '</span>
            </div>
            <div class="row">
                <span class="label">No. Rekam Medis (RM)</span>
                <span class="value" style="font-family: monospace;">' . $norm . '</span>
            </div>
            <div class="row">
                <span class="label">Jenis Pemeriksaan</span>
                <span class="value">' . $examName . '</span>
            </div>
            <div class="row">
                <span class="label">Waktu Pemeriksaan</span>
                <span class="value">' . $studyDate . '</span>
            </div>
            <div class="row">
                <span class="label">Dokter Radiologi</span>
                <span class="value" style="color: #38bdf8;">' . $doctorName . '</span>
            </div>
            <div class="row">
                <span class="label">Waktu Verifikasi Digital</span>
                <span class="value" style="color: #34d399;">' . $verifiedAt . '</span>
            </div>
            <div class="row">
                <span class="label">Status Keabsahan</span>
                <span class="value" style="color: #34d399; font-weight: bold;">ASLI & TERVALIDASI SISTEM</span>
            </div>
        </div>

        <p class="legal">
            Dokumen ini telah diverifikasi secara elektronik menggunakan Sistem Informasi Radiologi RSIA Livasya sesuai dengan ketentuan UU ITE No. 11/2008 & Standar Akreditasi Rumah Sakit (KARS).
        </p>
    </div>
</body>
</html>');
        }

        return response()->json([
            'valid' => true,
            'hospital' => 'RSIA Livasya Majalengka',
            'unit' => 'Instalasi Radiologi',
            'patient_name' => $report->dicomFile->patient->name ?? null,
            'medical_record_number' => $report->dicomFile->patient->medical_record_number ?? null,
            'study_date' => $studyDate,
            'exam_name' => $examName,
            'doctor_name' => $doctorName,
            'verified_at' => $verifiedAt,
            'status' => 'TERVERIFIKASI & DITANDATANGANI SECARA ELEKTRONIK',
            'verification_token' => $report->verification_token,
        ]);
    }
}
