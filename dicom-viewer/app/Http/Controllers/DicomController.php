<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Patient;
use App\Models\DicomFile;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class DicomController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'patient_name' => 'required|string',
            'medical_record_number' => 'required|string',
            'birth_date' => 'required|date',
            'priority' => 'nullable|string|in:regular,cito',
            'modality' => 'nullable|string',
            'file' => 'nullable|file',
            'files' => 'nullable|array',
            'files.*' => 'file',
        ]);

        if (!$request->hasFile('file') && !$request->hasFile('files')) {
            return response()->json(['message' => 'Please provide at least one DICOM file.'], 422);
        }

        $patient = Patient::firstOrCreate(
            ['medical_record_number' => $request->medical_record_number],
            ['name' => $request->patient_name, 'birth_date' => $request->birth_date]
        );

        $uploadedFiles = [];
        $filesToProcess = [];

        if ($request->hasFile('files')) {
            $filesToProcess = $request->file('files');
        } elseif ($request->hasFile('file')) {
            $filesToProcess = [$request->file('file')];
        }

        $priority = $request->input('priority', 'regular');
        $modality = $request->input('modality', 'DX');

        foreach ($filesToProcess as $file) {
            $uuid = Str::uuid()->toString();
            $fileName = $file->getClientOriginalName();
            $filePath = $file->storeAs('', $uuid . '.dcm', 'dicom');

            // Infer modality if not explicitly set, e.g. from filename
            $fileModality = $modality;
            $lowerName = strtolower($fileName);
            if (str_contains($lowerName, 'ct') || str_contains($lowerName, 'scan')) {
                $fileModality = 'CT';
            } elseif (str_contains($lowerName, 'mr') || str_contains($lowerName, 'mri')) {
                $fileModality = 'MR';
            } elseif (str_contains($lowerName, 'usg') || str_contains($lowerName, 'echo')) {
                $fileModality = 'US';
            } elseif (str_contains($lowerName, 'pano') || str_contains($lowerName, 'dental') || str_contains($lowerName, 'opg')) {
                $fileModality = 'PX';
            }

            $dicomFile = DicomFile::create([
                'patient_id' => $patient->id,
                'uuid' => $uuid,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'priority' => $priority,
                'modality' => $fileModality,
            ]);

            $uploadedFiles[] = $dicomFile;
        }

        return response()->json([
            'message' => count($uploadedFiles) . ' DICOM file(s) uploaded successfully',
            'dicom' => $uploadedFiles[0],
            'files' => $uploadedFiles
        ]);
    }

    private function getTagString($content, $group, $element) {
        $tagBytes = pack('v', $group) . pack('v', $element);
        $pos = strpos($content, $tagBytes);
        if ($pos !== false) {
            $vr = substr($content, $pos + 4, 2);
            if ($vr === 'CS' || $vr === 'SH' || $vr === 'LO' || $vr === 'UI' || $vr === 'PN' || $vr === 'DA' || $vr === 'TM' || $vr === 'ST') {
                $len = unpack('v', substr($content, $pos + 6, 2))[1];
                return trim(substr($content, $pos + 8, $len));
            } else {
                $len = unpack('V', substr($content, $pos + 4, 4));
                if ($len && $len[1] > 0 && $len[1] < 100) {
                    return trim(substr($content, $pos + 8, $len[1]));
                }
            }
        }
        return null;
    }

    private function getTagUS($content, $group, $element) {
        $tagBytes = pack('v', $group) . pack('v', $element);
        $pos = strpos($content, $tagBytes);
        if ($pos !== false) {
            $vr = substr($content, $pos + 4, 2);
            if ($vr === 'US' || $vr === 'SS') {
                return unpack('v', substr($content, $pos + 8, 2))[1];
            } else {
                $len = unpack('V', substr($content, $pos + 4, 4));
                if ($len && $len[1] === 2) {
                    return unpack('v', substr($content, $pos + 8, 2))[1];
                }
            }
        }
        return null;
    }

    private function getTransferSyntax($content) {
        $syntaxes = [
            '1.2.840.10008.1.2.1' => 'Explicit VR Little Endian',
            '1.2.840.10008.1.2.2' => 'Explicit VR Big Endian',
            '1.2.840.10008.1.2.4.50' => 'JPEG Baseline (Process 1)',
            '1.2.840.10008.1.2.4.51' => 'JPEG Extended (Process 2 & 4)',
            '1.2.840.10008.1.2.4.57' => 'JPEG Lossless (Process 14)',
            '1.2.840.10008.1.2.4.70' => 'JPEG Lossless (Process 14, SV1)',
            '1.2.840.10008.1.2.4.90' => 'JPEG 2000 Lossless',
            '1.2.840.10008.1.2.4.91' => 'JPEG 2000',
            '1.2.840.10008.1.2.5' => 'RLE Lossless',
            '1.2.840.10008.1.2' => 'Implicit VR Little Endian',
        ];
        foreach ($syntaxes as $uid => $name) {
            if (strpos($content, $uid) !== false) {
                return $uid;
            }
        }
        return '1.2.840.10008.1.2.1';
    }

    public function ohifJson($uuid)
    {
        $primaryFile = DicomFile::where('uuid', $uuid)->firstOrFail();
        $patient = $primaryFile->patient;

        // Fetch up to 3 files for this patient, keeping the requested file first
        $patientFiles = DicomFile::where('patient_id', $patient->id)
            ->orderByRaw("CASE WHEN uuid = ? THEN 0 ELSE 1 END", [$uuid])
            ->latest('id')
            ->take(3)
            ->get();

        $studyCleanUuid = str_replace('-', '.', $primaryFile->uuid);
        $seriesList = [];
        $seriesNum = 1;

        foreach ($patientFiles as $file) {
            $fileCleanUuid = str_replace('-', '.', $file->uuid);
            $fullPath = Storage::disk('dicom')->path($file->file_path);
            $content = '';
            if (file_exists($fullPath)) {
                $content = file_get_contents($fullPath, false, null, 0, 8192);
            }

            $rows = $this->getTagUS($content, 0x0028, 0x0010) ?? 512;
            $cols = $this->getTagUS($content, 0x0028, 0x0011) ?? 512;
            $transferSyntax = $this->getTransferSyntax($content);

            $photometric = $this->getTagString($content, 0x0028, 0x0004) ?? 'MONOCHROME2';
            $pixelRep = $this->getTagUS($content, 0x0028, 0x0103) ?? 0;
            $bitsAllocated = $this->getTagUS($content, 0x0028, 0x0100) ?? 16;
            $bitsStored = $this->getTagUS($content, 0x0028, 0x0101) ?? 16;
            $highBit = $this->getTagUS($content, 0x0028, 0x0102) ?? 15;

            $seriesDescription = pathinfo($file->file_name, PATHINFO_FILENAME);
            if (empty($seriesDescription)) {
                $seriesDescription = 'Examination ' . $seriesNum;
            }

            $seriesList[] = [
                'SeriesInstanceUID' => '1.2.3.4.5.6.' . $fileCleanUuid,
                'SeriesNumber' => $seriesNum,
                'SeriesDescription' => $seriesDescription,
                'Modality' => 'OT',
                'SeriesDate' => date('Ymd', strtotime($file->created_at ?? 'now')),
                'SeriesTime' => date('His', strtotime($file->created_at ?? 'now')),
                'instances' => [[
                    'metadata' => [
                        'Columns' => $cols,
                        'Rows' => $rows,
                        'InstanceNumber' => 1,
                        'SOPClassUID' => '1.2.840.10008.5.1.4.1.1.2',
                        'Modality' => 'OT',
                        'PhotometricInterpretation' => $photometric,
                        'BitsAllocated' => $bitsAllocated,
                        'BitsStored' => $bitsStored,
                        'PixelRepresentation' => $pixelRep,
                        'SamplesPerPixel' => 1,
                        'PixelSpacing' => [1.0, 1.0],
                        'HighBit' => $highBit,
                        'ImageOrientationPatient' => [1, 0, 0, 0, 1, 0],
                        'ImagePositionPatient' => [0, 0, 0],
                        'SOPInstanceUID' => '1.2.3.4.5.6.7.8.' . $fileCleanUuid,
                        'SeriesInstanceUID' => '1.2.3.4.5.6.' . $fileCleanUuid,
                        'StudyInstanceUID' => '1.2.3.4.5.' . $studyCleanUuid,
                        'TransferSyntaxUID' => $transferSyntax,
                        'SeriesDescription' => $seriesDescription,
                    ],
                    'url' => 'wadouri:/api/dicom/stream/' . $file->uuid
                ]]
            ];
            $seriesNum++;
        }

        return response()->json([
            'studies' => [[
                'StudyInstanceUID' => '1.2.3.4.5.' . $studyCleanUuid,
                'StudyDate' => date('Ymd', strtotime($primaryFile->created_at ?? 'now')),
                'StudyTime' => date('His', strtotime($primaryFile->created_at ?? 'now')),
                'PatientName' => $patient->name,
                'PatientID' => $patient->medical_record_number,
                'AccessionNumber' => '',
                'PatientAge' => '',
                'PatientSex' => '',
                'series' => $seriesList,
                'NumInstances' => count($seriesList),
                'Modalities' => 'OT'
            ]]
        ]);
    }

    public function stream($uuid)
    {
        $dicomFile = DicomFile::where('uuid', $uuid)->firstOrFail();

        $path = $dicomFile->file_path;

        if (!Storage::disk('dicom')->exists($path)) {
            abort(404, 'DICOM file not found.');
        }

        $fullPath = Storage::disk('dicom')->path($path);

        return response()->file($fullPath, [
            'Content-Type' => 'application/dicom',
            'Content-Disposition' => 'inline; filename="' . $dicomFile->file_name . '"'
        ]);
    }
}
