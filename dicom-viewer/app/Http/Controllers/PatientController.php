<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Patient;


class PatientController extends Controller
{
    public function index()
    {
        // Load patients along with their associated DICOM files and their reports
        $patients = Patient::with(['dicomFiles' => function($query) {
            $query->latest();
        }, 'dicomFiles.report'])->orderBy('created_at', 'desc')->get();
        return response()->json($patients);
    }
    public function destroy($id)
    {
        $patient = Patient::findOrFail($id);
        
        // Delete associated DICOM files from disk
        foreach ($patient->dicomFiles as $dicom) {
            \Illuminate\Support\Facades\Storage::disk('dicom')->delete($dicom->file_path);
        }
        
        // Let DB cascade handle deleting dicom_files and reports, or manually delete them
        // Assuming foreign keys are set to cascade. If not, delete them here:
        foreach ($patient->dicomFiles as $dicom) {
            if ($dicom->report) {
                $dicom->report->delete();
            }
            $dicom->delete();
        }

        $patient->delete();

        return response()->json(['message' => 'Patient deleted successfully']);
    }
}
