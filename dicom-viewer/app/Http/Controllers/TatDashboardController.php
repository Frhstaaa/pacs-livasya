<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DicomFile;
use App\Models\Report;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TatDashboardController extends Controller
{
    /**
     * Standard hospital benchmark targets in minutes
     */
    const TARGET_CITO_MINUTES = 60;        // ≤ 1 jam (Emergency / IGD)
    const TARGET_REGULAR_MINUTES = 180;    // ≤ 3 jam (Foto polos reguler)
    const TARGET_ADVANCED_MINUTES = 1440;  // ≤ 24 jam (CT-Scan / MRI)

    /**
     * Get TAT metrics, trends, doctor stats, and study details
     */
    public function index(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $priorityFilter = $request->query('priority', 'all');
        $statusFilter = $request->query('status', 'all');
        $modalityFilter = $request->query('modality', 'all');
        $doctorIdFilter = $request->query('doctor_id', 'all');

        // Query DICOM files with relationships
        $query = DicomFile::with(['patient', 'report.doctor']);

        if ($startDate) {
            $query->whereDate('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        if ($priorityFilter !== 'all') {
            $query->where('priority', $priorityFilter);
        }

        if ($modalityFilter !== 'all') {
            $query->where('modality', $modalityFilter);
        }

        $allFiles = $query->orderBy('created_at', 'desc')->get();

        $processedItems = [];
        $totalTatMinutes = 0;
        $completedCount = 0;
        $onTimeCount = 0;
        $delayedCount = 0;
        $pendingCount = 0;
        $pendingOverdueCount = 0;
        
        $citoCompleted = 0;
        $citoOnTime = 0;
        $regularCompleted = 0;
        $regularOnTime = 0;

        $doctorStatsMap = [];
        $modalityStatsMap = [];
        $dailyTrendsMap = [];

        foreach ($allFiles as $file) {
            $report = $file->report;
            $priority = $file->priority ?: 'regular';
            $modality = $file->modality ?: 'DX';

            // Determine benchmark target in minutes
            $targetMinutes = self::TARGET_REGULAR_MINUTES;
            if ($priority === 'cito') {
                $targetMinutes = self::TARGET_CITO_MINUTES;
            } elseif (in_array(strtoupper($modality), ['CT', 'MR', 'MRI'])) {
                $targetMinutes = self::TARGET_ADVANCED_MINUTES;
            }

            $isCompleted = false;
            $tatMinutes = null;
            $elapsedMinutes = null;
            $status = 'pending'; // 'on_time', 'delayed', 'pending'
            $doctorName = '-';
            $doctorId = null;

            if ($report && $report->updated_at) {
                $isCompleted = true;
                $completedCount++;
                
                // TAT = difference between image creation and report verification
                $tatMinutes = max(1, (int) round($file->created_at->diffInSeconds($report->updated_at) / 60));
                $totalTatMinutes += $tatMinutes;

                if ($tatMinutes <= $targetMinutes) {
                    $status = 'on_time';
                    $onTimeCount++;
                    if ($priority === 'cito') $citoOnTime++;
                    else $regularOnTime++;
                } else {
                    $status = 'delayed';
                    $delayedCount++;
                }

                if ($priority === 'cito') $citoCompleted++;
                else $regularCompleted++;

                if ($report->doctor) {
                    $doctorId = $report->doctor->id;
                    $doctorName = $report->doctor->name;
                    
                    if (!isset($doctorStatsMap[$doctorId])) {
                        $doctorStatsMap[$doctorId] = [
                            'id' => $doctorId,
                            'name' => $doctorName,
                            'total_reports' => 0,
                            'total_tat_minutes' => 0,
                            'on_time_count' => 0,
                        ];
                    }
                    $doctorStatsMap[$doctorId]['total_reports']++;
                    $doctorStatsMap[$doctorId]['total_tat_minutes'] += $tatMinutes;
                    if ($status === 'on_time') {
                        $doctorStatsMap[$doctorId]['on_time_count']++;
                    }
                }

                // Daily trends grouping
                $dateKey = $report->updated_at->format('Y-m-d');
                if (!isset($dailyTrendsMap[$dateKey])) {
                    $dailyTrendsMap[$dateKey] = [
                        'date' => $dateKey,
                        'display_date' => $report->updated_at->isoFormat('D MMM'),
                        'total' => 0,
                        'total_tat' => 0,
                        'on_time' => 0,
                    ];
                }
                $dailyTrendsMap[$dateKey]['total']++;
                $dailyTrendsMap[$dateKey]['total_tat'] += $tatMinutes;
                if ($status === 'on_time') {
                    $dailyTrendsMap[$dateKey]['on_time']++;
                }
            } else {
                $pendingCount++;
                $elapsedMinutes = (int) round($file->created_at->diffInSeconds(now()) / 60);
                if ($elapsedMinutes > $targetMinutes) {
                    $pendingOverdueCount++;
                }
            }

            // Modality breakdown
            if (!isset($modalityStatsMap[$modality])) {
                $modalityStatsMap[$modality] = [
                    'modality' => $modality,
                    'total' => 0,
                    'completed' => 0,
                    'total_tat' => 0,
                ];
            }
            $modalityStatsMap[$modality]['total']++;
            if ($isCompleted) {
                $modalityStatsMap[$modality]['completed']++;
                $modalityStatsMap[$modality]['total_tat'] += $tatMinutes;
            }

            // Check doctor filter
            if ($doctorIdFilter !== 'all' && $doctorId != $doctorIdFilter) {
                continue;
            }

            // Check status filter
            if ($statusFilter !== 'all' && $status !== $statusFilter) {
                continue;
            }

            $processedItems[] = [
                'id' => $file->id,
                'uuid' => $file->uuid,
                'file_name' => $file->file_name,
                'priority' => $priority,
                'modality' => $modality,
                'target_minutes' => $targetMinutes,
                'patient' => [
                    'id' => $file->patient ? $file->patient->id : null,
                    'name' => $file->patient ? $file->patient->name : 'Unknown',
                    'mrn' => $file->patient ? $file->patient->medical_record_number : '-',
                    'birth_date' => $file->patient ? $file->patient->birth_date : null,
                ],
                'created_at' => $file->created_at->format('Y-m-d H:i:s'),
                'created_at_display' => $file->created_at->format('d/m/Y H:i'),
                'verified_at' => ($report && $report->updated_at) ? $report->updated_at->format('Y-m-d H:i:s') : null,
                'verified_at_display' => ($report && $report->updated_at) ? $report->updated_at->format('d/m/Y H:i') : '-',
                'tat_minutes' => $tatMinutes,
                'tat_formatted' => $this->formatMinutes($tatMinutes),
                'elapsed_minutes' => $elapsedMinutes,
                'elapsed_formatted' => $this->formatMinutes($elapsedMinutes),
                'is_completed' => $isCompleted,
                'status' => $status,
                'doctor_name' => $doctorName,
                'doctor_id' => $doctorId,
            ];
        }

        // Summary calculations
        $avgTatMinutes = $completedCount > 0 ? (int) round($totalTatMinutes / $completedCount) : 0;
        $onTimePercentage = $completedCount > 0 ? round(($onTimeCount / $completedCount) * 100, 1) : 0;
        
        $citoOnTimePercentage = $citoCompleted > 0 ? round(($citoOnTime / $citoCompleted) * 100, 1) : 0;
        $regularOnTimePercentage = $regularCompleted > 0 ? round(($regularOnTime / $regularCompleted) * 100, 1) : 0;

        // Process doctor performance
        $doctorPerformance = [];
        foreach ($doctorStatsMap as $doc) {
            $avgDocTat = $doc['total_reports'] > 0 ? (int) round($doc['total_tat_minutes'] / $doc['total_reports']) : 0;
            $docOnTimeRate = $doc['total_reports'] > 0 ? round(($doc['on_time_count'] / $doc['total_reports']) * 100, 1) : 0;
            $doctorPerformance[] = [
                'id' => $doc['id'],
                'name' => $doc['name'],
                'total_reports' => $doc['total_reports'],
                'avg_tat_minutes' => $avgDocTat,
                'avg_tat_formatted' => $this->formatMinutes($avgDocTat),
                'on_time_rate' => $docOnTimeRate,
            ];
        }
        usort($doctorPerformance, fn($a, $b) => $b['total_reports'] <=> $a['total_reports']);

        // Process modality breakdown
        $modalityBreakdown = [];
        foreach ($modalityStatsMap as $mod) {
            $avgModTat = $mod['completed'] > 0 ? (int) round($mod['total_tat'] / $mod['completed']) : 0;
            $modalityBreakdown[] = [
                'modality' => $mod['modality'],
                'total' => $mod['total'],
                'completed' => $mod['completed'],
                'avg_tat_minutes' => $avgModTat,
                'avg_tat_formatted' => $this->formatMinutes($avgModTat),
            ];
        }
        usort($modalityBreakdown, fn($a, $b) => $b['total'] <=> $a['total']);

        // Process daily trends (sorted chronologically)
        ksort($dailyTrendsMap);
        $dailyTrends = [];
        foreach ($dailyTrendsMap as $day) {
            $dailyTrends[] = [
                'date' => $day['date'],
                'display_date' => $day['display_date'],
                'total' => $day['total'],
                'avg_tat_minutes' => $day['total'] > 0 ? (int) round($day['total_tat'] / $day['total']) : 0,
                'on_time_rate' => $day['total'] > 0 ? round(($day['on_time'] / $day['total']) * 100, 1) : 0,
            ];
        }

        // Available doctors for filter dropdown
        $doctorsList = User::where('role', 'doctor')->select('id', 'name')->get();

        return response()->json([
            'summary' => [
                'total_studies' => count($allFiles),
                'completed_studies' => $completedCount,
                'pending_studies' => $pendingCount,
                'pending_overdue' => $pendingOverdueCount,
                'on_time_studies' => $onTimeCount,
                'delayed_studies' => $delayedCount,
                'avg_tat_minutes' => $avgTatMinutes,
                'avg_tat_formatted' => $this->formatMinutes($avgTatMinutes),
                'on_time_percentage' => $onTimePercentage,
                'cito' => [
                    'total' => $allFiles->where('priority', 'cito')->count(),
                    'completed' => $citoCompleted,
                    'on_time_rate' => $citoOnTimePercentage,
                    'target_minutes' => self::TARGET_CITO_MINUTES,
                ],
                'regular' => [
                    'total' => $allFiles->where('priority', '!=', 'cito')->count(),
                    'completed' => $regularCompleted,
                    'on_time_rate' => $regularOnTimePercentage,
                    'target_minutes' => self::TARGET_REGULAR_MINUTES,
                ],
                'benchmarks' => [
                    'cito_target_minutes' => self::TARGET_CITO_MINUTES,
                    'regular_target_minutes' => self::TARGET_REGULAR_MINUTES,
                    'advanced_target_minutes' => self::TARGET_ADVANCED_MINUTES,
                    'quality_target_percentage' => 80.0, // Standar akreditasi RS
                ],
            ],
            'daily_trends' => $dailyTrends,
            'doctor_performance' => $doctorPerformance,
            'modality_breakdown' => $modalityBreakdown,
            'doctors_list' => $doctorsList,
            'details' => $processedItems,
        ]);
    }

    /**
     * Export TAT audit log to CSV for hospital quality committee
     */
    public function exportCsv(Request $request)
    {
        $response = $this->index($request);
        $data = json_decode($response->getContent(), true);
        $items = $data['details'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="laporan_indikator_mutu_tat_' . date('Y-m-d_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function() use ($items) {
            $output = fopen('php://output', 'w');
            
            // UTF-8 BOM for Microsoft Excel
            fputs($output, "\xEF\xBB\xBF");

            // CSV Header Row
            fputcsv($output, [
                'No.',
                'No. Rekam Medis',
                'Nama Pasien',
                'Modalitas',
                'Nama Berkas / Foto',
                'Prioritas',
                'Standar Target TAT (Menit)',
                'Waktu Selesai Foto',
                'Waktu Verifikasi Ekspertise',
                'Durasi TAT (Menit)',
                'Durasi TAT (Format)',
                'Status Kepatuhan Mutu',
                'Dokter Spesialis Radiologi',
            ]);

            $no = 1;
            foreach ($items as $item) {
                $statusIndo = 'Sedang Menunggu';
                if ($item['status'] === 'on_time') {
                    $statusIndo = 'Memenuhi Standar (Tepat Waktu)';
                } elseif ($item['status'] === 'delayed') {
                    $statusIndo = 'Melebihi Standar (Terlambat)';
                }

                fputcsv($output, [
                    $no++,
                    $item['patient']['mrn'],
                    $item['patient']['name'],
                    $item['modality'],
                    $item['file_name'],
                    strtoupper($item['priority']),
                    $item['target_minutes'] . ' Menit',
                    $item['created_at_display'],
                    $item['verified_at_display'],
                    $item['tat_minutes'] !== null ? $item['tat_minutes'] : '-',
                    $item['tat_formatted'] ?: ($item['elapsed_formatted'] ? 'Menunggu ' . $item['elapsed_formatted'] : '-'),
                    $statusIndo,
                    $item['doctor_name'],
                ]);
            }

            fclose($output);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Format minutes to human readable Indonesian string (e.g. "45 Menit", "1 Jam 15 Menit")
     */
    private function formatMinutes(?int $minutes): string
    {
        if ($minutes === null || $minutes <= 0) return '-';
        
        if ($minutes < 60) {
            return $minutes . ' Menit';
        }

        $hours = floor($minutes / 60);
        $remMinutes = $minutes % 60;

        if ($hours >= 24) {
            $days = floor($hours / 24);
            $remHours = $hours % 24;
            return $days . ' Hari ' . ($remHours > 0 ? $remHours . ' Jam' : '');
        }

        return $hours . ' Jam' . ($remMinutes > 0 ? ' ' . $remMinutes . ' Menit' : '');
    }
}
