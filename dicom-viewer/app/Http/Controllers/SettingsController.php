<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    private function getSetting($key)
    {
        $setting = Setting::where('key', $key)->first();
        return $setting ? $setting->value : null;
    }

    public function getAppSettings()
    {
        $settings = Cache::remember('app_settings_data', 86400, function () {
            $records = Setting::whereIn('key', ['app_name', 'hospital_name', 'app_logo'])
                ->pluck('value', 'key');

            $logoBase64 = null;
            $logoPath = $records['app_logo'] ?? null;
            if ($logoPath && Storage::disk('public')->exists($logoPath)) {
                $path = Storage::disk('public')->path($logoPath);
                $type = pathinfo($path, PATHINFO_EXTENSION);
                $data = file_get_contents($path);
                $logoBase64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
            }

            return [
                'app_name' => $records['app_name'] ?? 'DICOM PACS',
                'hospital_name' => $records['hospital_name'] ?? 'RSIA Livasya Majalengka',
                'app_logo' => $logoBase64,
            ];
        });

        return response()->json($settings);
    }

    public function saveAppSettings(Request $request)
    {
        $request->validate([
            'app_name' => 'nullable|string|max:255',
            'hospital_name' => 'nullable|string|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048', // max 2MB
        ]);

        if ($request->has('app_name')) {
            Setting::updateOrCreate(
                ['key' => 'app_name'],
                ['value' => $request->app_name]
            );
        }

        if ($request->has('hospital_name')) {
            Setting::updateOrCreate(
                ['key' => 'hospital_name'],
                ['value' => $request->hospital_name]
            );
        }

        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos', 'public');
            
            // Delete old logo if it exists
            $oldLogo = $this->getSetting('app_logo');
            if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
                Storage::disk('public')->delete($oldLogo);
            }

            Setting::updateOrCreate(
                ['key' => 'app_logo'],
                ['value' => $logoPath]
            );
        }

        // Invalidate cache immediately so new settings take effect instantly
        Cache::forget('app_settings_data');

        return response()->json(['message' => 'Settings saved successfully']);
    }
}
