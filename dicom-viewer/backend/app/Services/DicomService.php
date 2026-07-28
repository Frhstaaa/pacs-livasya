<?php

namespace App\Services;

use App\Repositories\PatientRepository;
use App\Repositories\DicomRepository;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Exception;

class DicomService
{
    protected PatientRepository $patientRepo;
    protected DicomRepository $dicomRepo;

    public function __construct(PatientRepository $patientRepo, DicomRepository $dicomRepo)
    {
        $this->patientRepo = $patientRepo;
        $this->dicomRepo = $dicomRepo;
    }

    /**
     * Parse DICOM file and save it to the database
     *
     * @param string $fullPath Path to the DICOM file on the network share
     * @return void
     * @throws Exception
     */
    public function importDicom(string $fullPath): void
    {
        if (!is_file($fullPath)) {
            throw new Exception('File not found on router.');
        }

        $content = file_get_contents($fullPath);
        if (!$content) {
            throw new Exception('Failed to read file.');
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

        // Use Repository
        $patient = $this->patientRepo->firstOrCreateByMrn($mrn, [
            'name' => $patientName, 
            'birth_date' => $birthDate
        ]);

        $uuid = Str::uuid()->toString();
        $fileName = basename($fullPath);
        
        Storage::disk('dicom')->put($uuid . '.dcm', $content);

        // Use Repository
        $this->dicomRepo->create([
            'patient_id' => $patient->id,
            'uuid' => $uuid,
            'file_name' => $fileName,
            'file_path' => $uuid . '.dcm',
        ]);
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
