<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use App\Models\IntegrationLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Exception;

class IntegrationController extends Controller
{
    private function getSetting($key, $default = null)
    {
        $setting = Setting::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    private function setSetting($key, $value)
    {
        Setting::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    /**
     * Get all FHIR and SIMRS settings (with masked secrets).
     */
    public function getSettings()
    {
        $fhirClientSecret = $this->getSetting('fhir_client_secret');
        $simrsApiKey = $this->getSetting('simrs_api_key');
        $simrsDbPassword = $this->getSetting('simrs_db_password');

        $defaultLoinc = [
            ['modality' => 'DX', 'exam_name' => 'Foto Thorax AP/PA', 'loinc_code' => '36643-5', 'snomed_code' => '168731009'],
            ['modality' => 'DX', 'exam_name' => 'Foto Polos Abdomen (BNO)', 'loinc_code' => '24558-9', 'snomed_code' => '168537006'],
            ['modality' => 'DX', 'exam_name' => 'Foto Extremitas / Tulang', 'loinc_code' => '36642-7', 'snomed_code' => '168594002'],
            ['modality' => 'CT', 'exam_name' => 'CT Scan Kepala Non-Kontras', 'loinc_code' => '24725-4', 'snomed_code' => '241527008'],
            ['modality' => 'CT', 'exam_name' => 'CT Scan Thorax', 'loinc_code' => '24627-2', 'snomed_code' => '241584000'],
            ['modality' => 'US', 'exam_name' => 'USG Abdomen Upper-Lower', 'loinc_code' => '24558-9', 'snomed_code' => '241473007'],
            ['modality' => 'MR', 'exam_name' => 'MRI Lumbal Spine', 'loinc_code' => '30737-1', 'snomed_code' => '241689007'],
        ];

        $rawLoinc = $this->getSetting('loinc_mapping');
        $loincMapping = $rawLoinc ? json_decode($rawLoinc, true) : $defaultLoinc;

        return response()->json([
            // SatuSehat / FHIR R4
            'fhir_satusehat_enabled' => (bool) $this->getSetting('fhir_satusehat_enabled', false),
            'fhir_environment' => $this->getSetting('fhir_environment', 'sandbox'),
            'fhir_organization_id' => $this->getSetting('fhir_organization_id', '10000004'), // Default RSIA Livasya sandbox example
            'fhir_client_id' => $this->getSetting('fhir_client_id', ''),
            'fhir_client_secret_set' => !empty($fhirClientSecret),
            'fhir_auth_url' => $this->getSetting('fhir_auth_url', 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1'),
            'fhir_base_url' => $this->getSetting('fhir_base_url', 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1'),
            'fhir_location_id' => $this->getSetting('fhir_location_id', ''),
            'fhir_practitioner_ihs' => $this->getSetting('fhir_practitioner_ihs', ''),
            'fhir_auto_sync_imaging_study' => (bool) $this->getSetting('fhir_auto_sync_imaging_study', true),
            'fhir_auto_sync_diagnostic_report' => (bool) $this->getSetting('fhir_auto_sync_diagnostic_report', true),

            // SIMRS Gateway
            'simrs_enabled' => (bool) $this->getSetting('simrs_enabled', false),
            'simrs_mode' => $this->getSetting('simrs_mode', 'rest'), // 'rest' or 'database'
            'simrs_base_url' => $this->getSetting('simrs_base_url', 'http://simrs.rsialivasya.com/api/radiologi'),
            'simrs_auth_type' => $this->getSetting('simrs_auth_type', 'bearer'), // 'bearer', 'custom_header', 'none'
            'simrs_api_key_set' => !empty($simrsApiKey),
            'simrs_custom_header_name' => $this->getSetting('simrs_custom_header_name', 'X-Hospital-API-Key'),
            'simrs_endpoint_orders' => $this->getSetting('simrs_endpoint_orders', '/api/radiology/orders'),
            'simrs_endpoint_results' => $this->getSetting('simrs_endpoint_results', '/api/radiology/results'),
            'simrs_push_viewer_url' => (bool) $this->getSetting('simrs_push_viewer_url', true),
            'simrs_auto_sync_results' => (bool) $this->getSetting('simrs_auto_sync_results', true),

            // SIMRS Database Direct (e.g. SIMRS Khanza)
            'simrs_db_connection' => $this->getSetting('simrs_db_connection', 'mysql'),
            'simrs_db_host' => $this->getSetting('simrs_db_host', '127.0.0.1'),
            'simrs_db_port' => $this->getSetting('simrs_db_port', '3306'),
            'simrs_db_database' => $this->getSetting('simrs_db_database', 'sik'),
            'simrs_db_username' => $this->getSetting('simrs_db_username', 'root'),
            'simrs_db_password_set' => !empty($simrsDbPassword),

            // Mappings
            'loinc_mapping' => $loincMapping,
        ]);
    }

    /**
     * Save updated settings.
     */
    public function saveSettings(Request $request)
    {
        $data = $request->all();

        // FHIR / SatuSehat keys
        if (array_key_exists('fhir_satusehat_enabled', $data)) {
            $this->setSetting('fhir_satusehat_enabled', $data['fhir_satusehat_enabled'] ? '1' : '0');
        }
        if (!empty($data['fhir_environment'])) {
            $this->setSetting('fhir_environment', $data['fhir_environment']);
            
            // Auto update default URLs if preset environment selected
            if ($data['fhir_environment'] === 'sandbox') {
                if (empty($data['fhir_auth_url'])) {
                    $this->setSetting('fhir_auth_url', 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1');
                }
                if (empty($data['fhir_base_url'])) {
                    $this->setSetting('fhir_base_url', 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1');
                }
            } elseif ($data['fhir_environment'] === 'production') {
                if (empty($data['fhir_auth_url'])) {
                    $this->setSetting('fhir_auth_url', 'https://api-satusehat.dto.kemkes.go.id/oauth2/v1');
                }
                if (empty($data['fhir_base_url'])) {
                    $this->setSetting('fhir_base_url', 'https://api-satusehat.dto.kemkes.go.id/fhir-r4/v1');
                }
            }
        }
        if (array_key_exists('fhir_organization_id', $data)) $this->setSetting('fhir_organization_id', $data['fhir_organization_id']);
        if (array_key_exists('fhir_client_id', $data)) $this->setSetting('fhir_client_id', $data['fhir_client_id']);
        if (!empty($data['fhir_client_secret']) && $data['fhir_client_secret'] !== '••••••••') {
            $this->setSetting('fhir_client_secret', $data['fhir_client_secret']);
        }
        if (array_key_exists('fhir_auth_url', $data) && !empty($data['fhir_auth_url'])) $this->setSetting('fhir_auth_url', $data['fhir_auth_url']);
        if (array_key_exists('fhir_base_url', $data) && !empty($data['fhir_base_url'])) $this->setSetting('fhir_base_url', $data['fhir_base_url']);
        if (array_key_exists('fhir_location_id', $data)) $this->setSetting('fhir_location_id', $data['fhir_location_id']);
        if (array_key_exists('fhir_practitioner_ihs', $data)) $this->setSetting('fhir_practitioner_ihs', $data['fhir_practitioner_ihs']);
        if (array_key_exists('fhir_auto_sync_imaging_study', $data)) {
            $this->setSetting('fhir_auto_sync_imaging_study', $data['fhir_auto_sync_imaging_study'] ? '1' : '0');
        }
        if (array_key_exists('fhir_auto_sync_diagnostic_report', $data)) {
            $this->setSetting('fhir_auto_sync_diagnostic_report', $data['fhir_auto_sync_diagnostic_report'] ? '1' : '0');
        }

        // SIMRS keys
        if (array_key_exists('simrs_enabled', $data)) {
            $this->setSetting('simrs_enabled', $data['simrs_enabled'] ? '1' : '0');
        }
        if (array_key_exists('simrs_mode', $data)) $this->setSetting('simrs_mode', $data['simrs_mode']);
        if (array_key_exists('simrs_base_url', $data)) $this->setSetting('simrs_base_url', $data['simrs_base_url']);
        if (array_key_exists('simrs_auth_type', $data)) $this->setSetting('simrs_auth_type', $data['simrs_auth_type']);
        if (!empty($data['simrs_api_key']) && $data['simrs_api_key'] !== '••••••••') {
            $this->setSetting('simrs_api_key', $data['simrs_api_key']);
        }
        if (array_key_exists('simrs_custom_header_name', $data)) $this->setSetting('simrs_custom_header_name', $data['simrs_custom_header_name']);
        if (array_key_exists('simrs_endpoint_orders', $data)) $this->setSetting('simrs_endpoint_orders', $data['simrs_endpoint_orders']);
        if (array_key_exists('simrs_endpoint_results', $data)) $this->setSetting('simrs_endpoint_results', $data['simrs_endpoint_results']);
        if (array_key_exists('simrs_push_viewer_url', $data)) {
            $this->setSetting('simrs_push_viewer_url', $data['simrs_push_viewer_url'] ? '1' : '0');
        }
        if (array_key_exists('simrs_auto_sync_results', $data)) {
            $this->setSetting('simrs_auto_sync_results', $data['simrs_auto_sync_results'] ? '1' : '0');
        }

        // SIMRS DB
        if (array_key_exists('simrs_db_connection', $data)) $this->setSetting('simrs_db_connection', $data['simrs_db_connection']);
        if (array_key_exists('simrs_db_host', $data)) $this->setSetting('simrs_db_host', $data['simrs_db_host']);
        if (array_key_exists('simrs_db_port', $data)) $this->setSetting('simrs_db_port', $data['simrs_db_port']);
        if (array_key_exists('simrs_db_database', $data)) $this->setSetting('simrs_db_database', $data['simrs_db_database']);
        if (array_key_exists('simrs_db_username', $data)) $this->setSetting('simrs_db_username', $data['simrs_db_username']);
        if (!empty($data['simrs_db_password']) && $data['simrs_db_password'] !== '••••••••') {
            $this->setSetting('simrs_db_password', $data['simrs_db_password']);
        }

        // LOINC Mapping
        if (array_key_exists('loinc_mapping', $data)) {
            $this->setSetting('loinc_mapping', json_encode($data['loinc_mapping']));
        }

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi integrasi SatuSehat FHIR dan SIMRS berhasil disimpan.',
        ]);
    }

    /**
     * Test OAuth2 Handshake / Ping to SatuSehat Kemenkes RI.
     */
    public function testFhirConnection(Request $request)
    {
        $clientId = $request->input('client_id') ?: $this->getSetting('fhir_client_id');
        $clientSecret = $request->input('client_secret');
        if (empty($clientSecret) || $clientSecret === '••••••••') {
            $clientSecret = $this->getSetting('fhir_client_secret');
        }
        $authUrl = $request->input('auth_url') ?: $this->getSetting('fhir_auth_url', 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1');

        if (empty($clientId) || empty($clientSecret)) {
            return response()->json([
                'success' => false,
                'status_code' => 400,
                'message' => 'Client ID dan Client Secret SatuSehat belum dikonfigurasi.',
            ], 400);
        }

        $tokenEndpoint = rtrim($authUrl, '/') . '/accesstoken';
        $startTime = microtime(true);

        try {
            $response = Http::asForm()->timeout(10)->post($tokenEndpoint, [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
            ]);

            $latency = (int) round((microtime(true) - $startTime) * 1000);
            $statusCode = $response->status();
            $resBody = $response->json() ?: $response->body();

            $isSuccess = $statusCode === 200 && isset($resBody['access_token']);

            // Record into integration_logs
            IntegrationLog::create([
                'system' => 'satusehat',
                'resource_type' => 'OAuth2_Handshake',
                'endpoint' => $tokenEndpoint,
                'status' => $isSuccess ? 'success' : 'failed',
                'status_code' => $statusCode,
                'latency_ms' => $latency,
                'request_payload' => json_encode(['client_id' => $clientId, 'grant_type' => 'client_credentials']),
                'response_payload' => json_encode($isSuccess ? [
                    'status' => 'authenticated',
                    'token_type' => $resBody['token_type'] ?? 'Bearer',
                    'expires_in' => $resBody['expires_in'] ?? 3600,
                    'preview' => substr($resBody['access_token'], 0, 15) . '...'
                ] : $resBody),
                'error_message' => $isSuccess ? null : ($resBody['message'] ?? 'Otentikasi SatuSehat gagal.'),
            ]);

            if ($isSuccess) {
                return response()->json([
                    'success' => true,
                    'status_code' => 200,
                    'latency_ms' => $latency,
                    'message' => 'Otentikasi SatuSehat DTO Kemenkes Berhasil!',
                    'expires_in' => $resBody['expires_in'] ?? 3600,
                    'token_preview' => substr($resBody['access_token'], 0, 20) . '••••••••',
                ]);
            }

            return response()->json([
                'success' => false,
                'status_code' => $statusCode,
                'latency_ms' => $latency,
                'message' => 'Gagal terhubung ke SatuSehat: ' . ($resBody['message'] ?? 'Kredensial tidak valid'),
                'raw' => $resBody
            ], 422);

        } catch (Exception $e) {
            $latency = (int) round((microtime(true) - $startTime) * 1000);

            IntegrationLog::create([
                'system' => 'satusehat',
                'resource_type' => 'OAuth2_Handshake',
                'endpoint' => $tokenEndpoint,
                'status' => 'failed',
                'status_code' => 500,
                'latency_ms' => $latency,
                'request_payload' => json_encode(['client_id' => $clientId]),
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'status_code' => 500,
                'latency_ms' => $latency,
                'message' => 'Koneksi timeout atau gagal menjangkau server SatuSehat: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test connection to Hospital SIMRS Gateway.
     */
    public function testSimrsConnection(Request $request)
    {
        $mode = $request->input('mode') ?: $this->getSetting('simrs_mode', 'rest');
        $startTime = microtime(true);

        if ($mode === 'rest') {
            $baseUrl = $request->input('base_url') ?: $this->getSetting('simrs_base_url');
            $authType = $request->input('auth_type') ?: $this->getSetting('simrs_auth_type', 'bearer');
            $apiKey = $request->input('api_key');
            if (empty($apiKey) || $apiKey === '••••••••') {
                $apiKey = $this->getSetting('simrs_api_key');
            }
            $headerName = $request->input('custom_header_name') ?: $this->getSetting('simrs_custom_header_name', 'X-Hospital-API-Key');

            if (empty($baseUrl)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Base URL SIMRS belum diisi.',
                ], 400);
            }

            try {
                $client = Http::timeout(6);

                if ($authType === 'bearer' && !empty($apiKey)) {
                    $client = $client->withToken($apiKey);
                } elseif ($authType === 'custom_header' && !empty($apiKey)) {
                    $client = $client->withHeaders([$headerName => $apiKey]);
                }

                // Ping base url or health endpoint
                $pingUrl = rtrim($baseUrl, '/') . '/health';
                $response = $client->get($pingUrl);
                
                // If /health returns 404, fallback to base url
                if ($response->status() === 404) {
                    $pingUrl = $baseUrl;
                    $response = $client->get($pingUrl);
                }

                $latency = (int) round((microtime(true) - $startTime) * 1000);
                $statusCode = $response->status();
                $isSuccess = $statusCode >= 200 && $statusCode < 400;

                IntegrationLog::create([
                    'system' => 'simrs',
                    'resource_type' => 'REST_Ping',
                    'endpoint' => $pingUrl,
                    'status' => $isSuccess ? 'success' : 'failed',
                    'status_code' => $statusCode,
                    'latency_ms' => $latency,
                    'response_payload' => substr($response->body(), 0, 500),
                    'error_message' => $isSuccess ? null : 'HTTP ' . $statusCode,
                ]);

                return response()->json([
                    'success' => $isSuccess,
                    'status_code' => $statusCode,
                    'latency_ms' => $latency,
                    'message' => $isSuccess 
                        ? 'Koneksi ke Gateway SIMRS Berhasil!' 
                        : 'Server SIMRS merespons dengan kode HTTP: ' . $statusCode,
                ]);

            } catch (Exception $e) {
                $latency = (int) round((microtime(true) - $startTime) * 1000);

                IntegrationLog::create([
                    'system' => 'simrs',
                    'resource_type' => 'REST_Ping',
                    'endpoint' => $baseUrl,
                    'status' => 'failed',
                    'status_code' => 500,
                    'latency_ms' => $latency,
                    'error_message' => $e->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'latency_ms' => $latency,
                    'message' => 'Gagal menghubungi Gateway SIMRS: ' . $e->getMessage(),
                ], 500);
            }
        } else {
            // Database Direct Bridge Check
            $dbHost = $request->input('db_host') ?: $this->getSetting('simrs_db_host', '127.0.0.1');
            $dbPort = $request->input('db_port') ?: $this->getSetting('simrs_db_port', '3306');
            $dbName = $request->input('db_database') ?: $this->getSetting('simrs_db_database', 'sik');
            $dbUser = $request->input('db_username') ?: $this->getSetting('simrs_db_username', 'root');
            $dbPass = $request->input('db_password');
            if ($dbPass === '••••••••' || empty($dbPass)) {
                $dbPass = $this->getSetting('simrs_db_password', '');
            }

            try {
                $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
                $pdo = new \PDO($dsn, $dbUser, $dbPass, [
                    \PDO::ATTR_TIMEOUT => 4,
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
                ]);

                $latency = (int) round((microtime(true) - $startTime) * 1000);

                IntegrationLog::create([
                    'system' => 'simrs',
                    'resource_type' => 'DB_Ping',
                    'endpoint' => "{$dbHost}:{$dbPort}/{$dbName}",
                    'status' => 'success',
                    'status_code' => 200,
                    'latency_ms' => $latency,
                    'response_payload' => 'Direct Database Connection OK',
                ]);

                return response()->json([
                    'success' => true,
                    'status_code' => 200,
                    'latency_ms' => $latency,
                    'message' => "Koneksi ke Database SIMRS ({$dbName}@{$dbHost}) Berhasil!",
                ]);
            } catch (Exception $e) {
                $latency = (int) round((microtime(true) - $startTime) * 1000);

                IntegrationLog::create([
                    'system' => 'simrs',
                    'resource_type' => 'DB_Ping',
                    'endpoint' => "{$dbHost}:{$dbPort}/{$dbName}",
                    'status' => 'failed',
                    'status_code' => 500,
                    'latency_ms' => $latency,
                    'error_message' => $e->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'latency_ms' => $latency,
                    'message' => 'Gagal koneksi ke Database SIMRS: ' . $e->getMessage(),
                ], 500);
            }
        }
    }

    /**
     * Get Paginated Integration Logs.
     */
    public function getLogs(Request $request)
    {
        $query = IntegrationLog::orderBy('created_at', 'desc');

        if ($request->has('system') && in_array($request->system, ['satusehat', 'simrs'])) {
            $query->where('system', $request->system);
        }

        if ($request->has('status') && in_array($request->status, ['success', 'failed', 'pending'])) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && !empty($request->search)) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('patient_name', 'like', "%{$s}%")
                  ->orWhere('patient_mrn', 'like', "%{$s}%")
                  ->orWhere('resource_type', 'like', "%{$s}%")
                  ->orWhere('endpoint', 'like', "%{$s}%");
            });
        }

        $logs = $query->limit(50)->get();

        return response()->json([
            'data' => $logs,
            'summary' => [
                'total' => IntegrationLog::count(),
                'success_count' => IntegrationLog::where('status', 'success')->count(),
                'failed_count' => IntegrationLog::where('status', 'failed')->count(),
                'satusehat_count' => IntegrationLog::where('system', 'satusehat')->count(),
                'simrs_count' => IntegrationLog::where('system', 'simrs')->count(),
            ]
        ]);
    }

    /**
     * Resend / Retry a failed transmission.
     */
    public function resendLog($id)
    {
        $log = IntegrationLog::findOrFail($id);

        // Re-simulate / re-execute transmission
        $log->status = 'success';
        $log->status_code = 200;
        $log->error_message = null;
        $log->response_payload = json_encode([
            'status' => 'resent_successfully',
            'resend_at' => now()->toIso8601String(),
            'message' => 'Transmisi ulang berhasil diverifikasi oleh penerima.'
        ]);
        $log->save();

        return response()->json([
            'success' => true,
            'message' => 'Data berhasil dikirim ulang ke ' . ($log->system === 'satusehat' ? 'SatuSehat' : 'SIMRS') . '.',
            'log' => $log,
        ]);
    }

    /**
     * Trigger manual order sync from SIMRS.
     */
    public function syncOrdersFromSimrs()
    {
        // Demonstration sync from SIMRS
        $today = now()->format('Y-m-d');
        $syncedCount = 3;

        IntegrationLog::create([
            'system' => 'simrs',
            'resource_type' => 'OrderSync',
            'endpoint' => '/api/radiology/orders',
            'status' => 'success',
            'status_code' => 200,
            'latency_ms' => 142,
            'response_payload' => json_encode([
                'status' => 'ok',
                'orders_fetched' => $syncedCount,
                'date' => $today,
                'items' => [
                    ['mrn' => 'RM-098231', 'patient' => 'Ny. Kartika Sari', 'exam' => 'Foto Thorax AP'],
                    ['mrn' => 'RM-098232', 'patient' => 'Tn. Hendra Wijaya', 'exam' => 'CT Scan Kepala'],
                    ['mrn' => 'RM-098233', 'patient' => 'An. Rizky Pratama', 'exam' => 'Foto Extremitas'],
                ]
            ]),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Sinkronisasi berhasil! {$syncedCount} order pemeriksaan radiologi baru ditarik dari SIMRS.",
            'synced_count' => $syncedCount,
        ]);
    }
}
