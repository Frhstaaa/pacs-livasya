<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function ($any = null) {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    if (str_starts_with($requestUri, '/ohif')) {
        $ohifPath = public_path('ohif/index.html');
        if (file_exists($ohifPath)) {
            return file_get_contents($ohifPath);
        }
    }
    
    $path = public_path('index.html');
    if (file_exists($path)) {
        return file_get_contents($path);
    }
    return view('welcome'); // fallback if build not found
})->where('any', '.*');
