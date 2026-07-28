<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Report;
use App\Models\DicomFile;
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

        $data = [
            'doctor_id' => $request->user()->id,
            'content' => $request->content,
        ];

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

        return response()->json(['message' => 'Report saved successfully', 'report' => $report]);
    }

    public function show($uuid)
    {
        $dicomFile = DicomFile::with('patient')->where('uuid', $uuid)->firstOrFail();
        $report = Report::with('doctor')->where('dicom_file_id', $dicomFile->id)->first();

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
            'dicom_file' => $dicomFile
        ]);
    }
}
