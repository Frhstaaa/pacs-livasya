<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AiService;
use Exception;

class AiController extends Controller
{
    protected AiService $aiService;

    public function __construct(AiService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function analyze(Request $request)
    {
        $request->validate([
            'image' => 'required|string', // Base64 encoded image
        ]);

        try {
            $result = $this->aiService->analyzeImage($request->image);
            return response()->json(['analysis' => $result]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
