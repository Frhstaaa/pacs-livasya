<?php

use Illuminate\Support\Facades\Route;

// Catch all web requests
Route::match(['GET', 'HEAD'], '/{any?}', function () {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    
    // Check if the request is destined for OHIF Viewer
    if (str_starts_with($requestUri, '/ohif')) {
        $parsedPath = parse_url($requestUri, PHP_URL_PATH);
        $cleanPath = preg_replace('#^/ohif/?#', '', $parsedPath);
        
        // If it requests a specific static file inside public/ohif/
        if ($cleanPath && $cleanPath !== 'viewer' && file_exists(public_path('ohif/' . $cleanPath))) {
            return response()->file(public_path('ohif/' . $cleanPath));
        }
        
        // Otherwise serve the OHIF Standalone Viewer index.html
        return response(file_get_contents(public_path('ohif/index.html')))->header('Content-Type', 'text/html');
    }

    return view('app');
})->where('any', '.*');
