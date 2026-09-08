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
use App\Http\Controllers\PermissionController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Patients & Worklist
    Route::get('/patients', [PatientController::class, 'index'])->middleware('permission:patients.view');
    Route::delete('/patients/{id}', [PatientController::class, 'destroy'])->middleware('permission:patients.delete');
    Route::post('/dicom/upload', [DicomController::class, 'upload'])->middleware('permission:dicom.upload');
    
    // Reports & Digital Verification
    Route::post('/report', [ReportController::class, 'store'])->middleware('permission:reports.create');
    Route::get('/report/{uuid}', [ReportController::class, 'show'])->middleware('permission:viewer.view');
    Route::post('/report/verify', [ReportController::class, 'verify'])->middleware('permission:reports.verify');
    Route::post('/report/unverify', [ReportController::class, 'unverify'])->middleware('permission:reports.unverify');

    // Structured Medical Report Templates (Macros)
    Route::get('/report-templates', [ReportTemplateController::class, 'index'])->middleware('permission:viewer.view');
    Route::post('/report-templates', [ReportTemplateController::class, 'store'])->middleware('permission:reports.templates');
    Route::put('/report-templates/{id}', [ReportTemplateController::class, 'update'])->middleware('permission:reports.templates');
    Route::delete('/report-templates/{id}', [ReportTemplateController::class, 'destroy'])->middleware('permission:reports.templates');
    Route::post('/report-templates/{id}/favorite', [ReportTemplateController::class, 'toggleFavorite'])->middleware('permission:reports.templates');

    // TAT Performance Dashboard (Hospital Quality Indicator)
    Route::get('/tat/dashboard', [TatDashboardController::class, 'index'])->middleware('permission:tat.view');
    Route::get('/tat/export', [TatDashboardController::class, 'exportCsv'])->middleware('permission:tat.export');

    // PACS Router Integration
    Route::get('/dicom-router/settings', [DicomRouterController::class, 'getSettings'])->middleware('permission:router.view');
    Route::post('/dicom-router/settings', [DicomRouterController::class, 'saveSettings'])->middleware('permission:router.manage');
    Route::post('/dicom-router/test', [DicomRouterController::class, 'testConnection'])->middleware('permission:router.manage');
    Route::get('/dicom-router/browse', [DicomRouterController::class, 'browse'])->middleware('permission:router.view');
    Route::post('/dicom-router/import', [DicomRouterController::class, 'import'])->middleware('permission:dicom.import_router');

    // AI Endpoint
    Route::post('/ai/analyze', [AiController::class, 'analyze'])->middleware('permission:ai.analyze');

    // User Management
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:users.view');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.create');
    Route::put('/users/{id}', [UserController::class, 'update'])->middleware('permission:users.edit');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

    // Role & Permission Management (RBAC & Per-User Overrides)
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:permissions.manage');
    Route::post('/permissions/roles', [PermissionController::class, 'updateRoles'])->middleware('permission:permissions.manage');
    Route::get('/permissions/users/{id}', [PermissionController::class, 'getUserPermissions'])->middleware('permission:permissions.manage');
    Route::post('/permissions/users/{id}', [PermissionController::class, 'updateUserPermissions'])->middleware('permission:permissions.manage');
    Route::post('/permissions/reset-defaults', [PermissionController::class, 'resetDefaults'])->middleware('permission:permissions.manage');

    // App Settings
    Route::post('/app/settings', [SettingsController::class, 'saveAppSettings'])->middleware('permission:settings.manage');

    // FHIR SatuSehat & SIMRS Integration Endpoints
    Route::get('/integration/settings', [IntegrationController::class, 'getSettings'])->middleware('permission:integration.view');
    Route::post('/integration/settings', [IntegrationController::class, 'saveSettings'])->middleware('permission:integration.manage');
    Route::post('/integration/test-fhir', [IntegrationController::class, 'testFhirConnection'])->middleware('permission:integration.manage');
    Route::post('/integration/test-simrs', [IntegrationController::class, 'testSimrsConnection'])->middleware('permission:integration.manage');
    Route::get('/integration/logs', [IntegrationController::class, 'getLogs'])->middleware('permission:integration.view');
    Route::post('/integration/logs/{id}/resend', [IntegrationController::class, 'resendLog'])->middleware('permission:integration.manage');
    Route::post('/integration/sync-orders', [IntegrationController::class, 'syncOrdersFromSimrs'])->middleware('permission:integration.manage');
});

// Public verification for QR Code scanning on printed reports
Route::get('/report/verify-public/{token}', [ReportController::class, 'verifyPublic'])->middleware('throttle:30,1');

// Public App Settings (name, logo) for Login & Guest layout
Route::get('/app/settings', [SettingsController::class, 'getAppSettings']);

// Stream endpoint must be outside auth middleware since Cornerstone/wadouri doesn't send auth headers easily
Route::get('/dicom/stream/{uuid}', [DicomController::class, 'stream'])->middleware('throttle:120,1');
Route::get('/dicom/json/{uuid}', [DicomController::class, 'ohifJson'])->middleware('throttle:120,1');
