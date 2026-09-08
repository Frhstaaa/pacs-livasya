<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\DicomController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\DicomRouterController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TatDashboardController;
use App\Http\Controllers\ReportTemplateController;
use App\Http\Controllers\IntegrationController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Patients
    Route::get('/patients', [PatientController::class, 'index']);
    Route::delete('/patients/{id}', [PatientController::class, 'destroy']);
    Route::post('/dicom/upload', [DicomController::class, 'upload']);
    
    // Reports & Digital Verification
    Route::post('/report', [ReportController::class, 'store']);
    Route::get('/report/{uuid}', [ReportController::class, 'show']);
    Route::post('/report/verify', [ReportController::class, 'verify']);
    Route::post('/report/unverify', [ReportController::class, 'unverify']);

    // Structured Medical Report Templates (Macros)
    Route::get('/report-templates', [ReportTemplateController::class, 'index']);
    Route::post('/report-templates', [ReportTemplateController::class, 'store']);
    Route::put('/report-templates/{id}', [ReportTemplateController::class, 'update']);
    Route::delete('/report-templates/{id}', [ReportTemplateController::class, 'destroy']);
    Route::post('/report-templates/{id}/favorite', [ReportTemplateController::class, 'toggleFavorite']);

    // TAT Performance Dashboard (Hospital Quality Indicator)
    Route::get('/tat/dashboard', [TatDashboardController::class, 'index']);
    Route::get('/tat/export', [TatDashboardController::class, 'exportCsv']);

    Route::get('/dicom-router/settings', [DicomRouterController::class, 'getSettings']);
    Route::post('/dicom-router/settings', [DicomRouterController::class, 'saveSettings']);
    Route::post('/dicom-router/test', [DicomRouterController::class, 'testConnection']);
    Route::get('/dicom-router/browse', [DicomRouterController::class, 'browse']);
    Route::post('/dicom-router/import', [DicomRouterController::class, 'import']);

    // AI Endpoint
    Route::post('/ai/analyze', [AiController::class, 'analyze']);

    // User Management
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // App Settings
    Route::post('/app/settings', [SettingsController::class, 'saveAppSettings']);

    // FHIR SatuSehat & SIMRS Integration Endpoints
    Route::get('/integration/settings', [IntegrationController::class, 'getSettings']);
    Route::post('/integration/settings', [IntegrationController::class, 'saveSettings']);
    Route::post('/integration/test-fhir', [IntegrationController::class, 'testFhirConnection']);
    Route::post('/integration/test-simrs', [IntegrationController::class, 'testSimrsConnection']);
    Route::get('/integration/logs', [IntegrationController::class, 'getLogs']);
    Route::post('/integration/logs/{id}/resend', [IntegrationController::class, 'resendLog']);
    Route::post('/integration/sync-orders', [IntegrationController::class, 'syncOrdersFromSimrs']);
});

// Public verification for QR Code scanning on printed reports
Route::get('/report/verify-public/{token}', [ReportController::class, 'verifyPublic']);

// Public App Settings (name, logo) for Login & Guest layout
Route::get('/app/settings', [SettingsController::class, 'getAppSettings']);

// Stream endpoint must be outside auth middleware since Cornerstone/wadouri doesn't send auth headers easily
Route::get('/dicom/stream/{uuid}', [DicomController::class, 'stream']);
Route::get('/dicom/json/{uuid}', [DicomController::class, 'ohifJson']);
