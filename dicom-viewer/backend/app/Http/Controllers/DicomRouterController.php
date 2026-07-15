<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use App\Models\Patient;
use App\Models\DicomFile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class DicomRouterController extends Controller
{
    private function getSetting($key)
    {
        $setting = Setting::where('key', $key)->first();
        return $setting ? $setting->value : '';
    }

    public function getSettings()
    {
        return response()->json([
            'dicom_router_path' => $this->getSetting('dicom_router_path'),
            'dicom_router_username' => $this->getSetting('dicom_router_username'),
            // DO NOT SEND PASSWORD BACK to frontend
            'dicom_router_password_set' => $this->getSetting('dicom_router_password') ? true : false,
        ]);
    }

    public function saveSettings(Request $request)
    {
        $request->validate([
            'dicom_router_path' => 'nullable|string',
            'dicom_router_username' => 'nullable|string',
            'dicom_router_password' => 'nullable|string',
        ]);

        Setting::updateOrCreate(['key' => 'dicom_router_path'], ['value' => $request->dicom_router_path]);
        Setting::updateOrCreate(['key' => 'dicom_router_username'], ['value' => $request->dicom_router_username]);
        if ($request->has('dicom_router_password') && !empty($request->dicom_router_password)) {
            Setting::updateOrCreate(['key' => 'dicom_router_password'], ['value' => $request->dicom_router_password]);
        }

        return response()->json(['message' => 'Settings saved successfully']);
    }

    public function testConnection()
    {
        $path = $this->getSetting('dicom_router_path');
        $username = $this->getSetting('dicom_router_username');
        $password = $this->getSetting('dicom_router_password');

        if (!$path) {
            return response()->json(['success' => false, 'message' => 'Router path is not configured.']);
        }

        // Clean up trailing slashes
        $path = rtrim($path, '\\/');

        // Try to delete existing connection first to avoid conflict (optional, but good practice)
        exec('net use "' . $path . '" /delete 2>NUL');

        $command = 'net use "' . $path . '"';
        if ($password) {
            $command .= ' "' . $password . '"';
        }
        if ($username) {
            $command .= ' /user:"' . $username . '"';
        }

        exec($command . ' 2>&1', $output, $returnVar);

        if ($returnVar === 0) {
            return response()->json(['success' => true, 'message' => 'Connection successful!']);
        } else {
            $errorDetail = implode("\n", $output);
            return response()->json(['success' => false, 'message' => 'Connection failed: ' . $errorDetail, 'output' => $errorDetail]);
        }
    }

    public function browse(Request $request)
    {
        $basePath = $this->getSetting('dicom_router_path');
        if (!$basePath) {
            return response()->json(['error' => 'Router path not configured.'], 400);
        }

        $basePath = rtrim($basePath, '\\/');
        $subPath = $request->query('path', '');
        
        // Basic security to prevent directory traversal
        if (strpos($subPath, '..') !== false) {
            return response()->json(['error' => 'Invalid path.'], 400);
        }

        $currentPath = $basePath . ($subPath ? '\\' . ltrim($subPath, '\\/') : '');

        // Ensure connected
        $this->connectToShare($basePath);

        if (!is_dir($currentPath)) {
            return response()->json(['error' => 'Directory not found: ' . $currentPath], 404);
        }

        $files = scandir($currentPath);
        $result = [];

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;

            $fullPath = $currentPath . '\\' . $file;
            $isDir = is_dir($fullPath);
            
            $result[] = [
                'name' => $file,
                'isDir' => $isDir,
                'path' => $subPath ? ltrim($subPath, '\\/') . '\\' . $file : $file
            ];
        }

        return response()->json(['path' => $subPath, 'contents' => $result]);
    }

    private function connectToShare($path)
    {
        $username = $this->getSetting('dicom_router_username');
        $password = $this->getSetting('dicom_router_password');
        
        $command = 'net use "' . rtrim($path, '\\/') . '"';
        if ($password) {
            $command .= ' "' . $password . '"';
        }
        if ($username) {
            $command .= ' /user:"' . $username . '"';
        }
        exec($command . ' 2>NUL');
    }

    public function import(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $basePath = $this->getSetting('dicom_router_path');
        if (!$basePath) {
            return response()->json(['error' => 'Router path not configured.'], 400);
        }
        $basePath = rtrim($basePath, '\\/');
        $subPath = ltrim($request->path, '\\/');
        $fullPath = $basePath . '\\' . $subPath;

        $this->connectToShare($basePath);

        if (!is_file($fullPath)) {
            return response()->json(['error' => 'File not found on router.'], 404);
        }

        $content = file_get_contents($fullPath);
        if (!$content) {
            return response()->json(['error' => 'Failed to read file.'], 500);
        }

        // Parse DICOM metadata
        $patientName = $this->extractStringTag($content, 0x0010, 0x0010) ?: 'Unknown Patient';
        $mrn = $this->extractStringTag($content, 0x0010, 0x0020) ?: 'UNKNOWN_MRN';
        
        $birthDateStr = $this->extractStringTag($content, 0x0010, 0x0030);
        $birthDate = null;
        if ($birthDateStr && strlen(trim($birthDateStr)) === 8) {
            $b = trim($birthDateStr);
            $birthDate = substr($b, 0, 4) . '-' . substr($b, 4, 2) . '-' . substr($b, 6, 2);
        } else {
            $birthDate = '1900-01-01'; // Default fallback
        }

        $patientName = str_replace('^', ' ', $patientName);
        $patientName = trim($patientName);
        $mrn = trim($mrn);

        $patient = Patient::firstOrCreate(
            ['medical_record_number' => $mrn],
            ['name' => $patientName, 'birth_date' => $birthDate]
        );

        $uuid = Str::uuid()->toString();
        $fileName = basename($fullPath);
        
        Storage::disk('dicom')->put($uuid . '.dcm', $content);

        $dicomFile = DicomFile::create([
            'patient_id' => $patient->id,
            'uuid' => $uuid,
            'file_name' => $fileName,
            'file_path' => $uuid . '.dcm',
        ]);

        return response()->json(['message' => 'Import successful', 'dicom' => $dicomFile]);
    }

    private function extractStringTag($content, $tagGroup, $tagElement) {
        $tagBytes = chr($tagGroup & 0xFF) . chr($tagGroup >> 8) . chr($tagElement & 0xFF) . chr($tagElement >> 8);
        $pos = strpos($content, $tagBytes);
        if ($pos !== false) {
            $vr = substr($content, $pos + 4, 2);
            $length = 0;
            $valOffset = 0;
            
            if (in_array($vr, ['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'])) {
                $len = unpack('V', substr($content, $pos + 8, 4));
                $length = $len[1];
                $valOffset = 12;
            } elseif (ctype_upper($vr)) {
                $len = unpack('v', substr($content, $pos + 6, 2));
                $length = $len[1];
                $valOffset = 8;
            } else {
                $len = unpack('V', substr($content, $pos + 4, 4));
                $length = $len[1];
                $valOffset = 8;
            }

            if ($length > 0 && $length < 1000) {
                return trim(substr($content, $pos + $valOffset, $length));
            }
        }
        return null;
    }
}
