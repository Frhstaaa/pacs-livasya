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

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Patients
    Route::get('/patients', [PatientController::class, 'index']);
    Route::delete('/patients/{id}', [PatientController::class, 'destroy']);
    Route::post('/dicom/upload', [DicomController::class, 'upload']);
    
    Route::post('/report', [ReportController::class, 'store']);
    Route::get('/report/{uuid}', [ReportController::class, 'show']);

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
    Route::get('/app/settings', [SettingsController::class, 'getAppSettings']);
    Route::post('/app/settings', [SettingsController::class, 'saveAppSettings']);
});

// Stream endpoint must be outside auth middleware since Cornerstone/wadouri doesn't send auth headers easily
Route::get('/dicom/stream/{uuid}', [DicomController::class, 'stream']);
Route::get('/dicom/json/{uuid}', [DicomController::class, 'ohifJson']);
