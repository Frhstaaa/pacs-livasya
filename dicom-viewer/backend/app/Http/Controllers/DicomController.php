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
            'file' => 'required|file',
            'patient_name' => 'required|string',
            'medical_record_number' => 'required|string',
            'birth_date' => 'required|date',
        ]);

        $patient = Patient::firstOrCreate(
            ['medical_record_number' => $request->medical_record_number],
            ['name' => $request->patient_name, 'birth_date' => $request->birth_date]
        );

        $file = $request->file('file');
        $uuid = Str::uuid()->toString();
        $fileName = $file->getClientOriginalName();
        $filePath = $file->storeAs('', $uuid . '.dcm', 'dicom');

        $dicomFile = DicomFile::create([
            'patient_id' => $patient->id,
            'uuid' => $uuid,
            'file_name' => $fileName,
            'file_path' => $filePath,
        ]);

        return response()->json(['message' => 'Upload successful', 'dicom' => $dicomFile]);
    }

    private function getDicomTagValue($content, $tagGroup, $tagElement) {
        $tagBytes = chr($tagGroup) . chr(0x00) . chr($tagElement) . chr(0x00);
        $pos = strpos($content, $tagBytes);
        if ($pos !== false) {
            $vr = substr($content, $pos + 4, 2);
            if ($vr === 'US' || $vr === 'SS') {
                $val = substr($content, $pos + 8, 2);
                $arr = unpack('v', $val);
                return $arr[1];
            } else {
                // Try implicit VR
                $len = unpack('V', substr($content, $pos + 4, 4));
                if ($len && $len[1] === 2) {
                    $val = substr($content, $pos + 8, 2);
                    $arr = unpack('v', $val);
                    return $arr[1];
                }
            }
        }
        return 512;
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
        $dicomFile = DicomFile::where('uuid', $uuid)->firstOrFail();
        $patient = $dicomFile->patient;

        // Strip hyphens from UUID for valid DICOM UID formatting (needs to be numeric generally, but OHIF might accept it)
        $cleanUuid = str_replace('-', '.', $uuid);

        $fullPath = Storage::disk('dicom')->path($dicomFile->file_path);
        $content = '';
        if (file_exists($fullPath)) {
            $content = file_get_contents($fullPath, false, null, 0, 8192);
        }

        $rows = $this->getDicomTagValue($content, 0x28, 0x10);
        $cols = $this->getDicomTagValue($content, 0x28, 0x11);
        $transferSyntax = $this->getTransferSyntax($content);

        return response()->json([
            'studies' => [[
                'StudyInstanceUID' => '1.2.3.4.5.' . $cleanUuid,
                'StudyDate' => date('Ymd'),
                'StudyTime' => date('His'),
                'PatientName' => $patient->name,
                'PatientID' => $patient->medical_record_number,
                'AccessionNumber' => '',
                'PatientAge' => '',
                'PatientSex' => '',
                'series' => [[
                    'SeriesInstanceUID' => '1.2.3.4.5.6.' . $cleanUuid,
                    'SeriesNumber' => 1,
                    'Modality' => 'OT',
                    'SeriesDate' => date('Ymd'),
                    'SeriesTime' => date('His'),
                    'instances' => [[
                        'metadata' => [
                            'Columns' => $cols,
                            'Rows' => $rows,
                            'InstanceNumber' => 1,
                            'SOPClassUID' => '1.2.840.10008.5.1.4.1.1.2',
                            'PhotometricInterpretation' => 'MONOCHROME2',
                            'BitsAllocated' => 16,
                            'BitsStored' => 16,
                            'PixelRepresentation' => 1,
                            'SamplesPerPixel' => 1,
                            'PixelSpacing' => [1.0, 1.0],
                            'HighBit' => 15,
                            'ImageOrientationPatient' => [1, 0, 0, 0, 1, 0],
                            'ImagePositionPatient' => [0, 0, 0],
                            'FrameOfReferenceUID' => '1.2.3.4.5.6.7.' . $cleanUuid,
                            'ImageType' => ['ORIGINAL', 'PRIMARY', 'AXIAL'],
                            'Modality' => 'OT',
                            'SOPInstanceUID' => '1.2.3.4.5.6.7.8.' . $cleanUuid,
                            'SeriesInstanceUID' => '1.2.3.4.5.6.' . $cleanUuid,
                            'StudyInstanceUID' => '1.2.3.4.5.' . $cleanUuid,
                            'TransferSyntaxUID' => $transferSyntax,
                        ],
                        'url' => 'wadouri:/api/dicom/stream/' . $uuid
                    ]]
                ]],
                'NumInstances' => 1,
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
