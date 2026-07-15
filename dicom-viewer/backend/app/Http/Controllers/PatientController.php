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
}
