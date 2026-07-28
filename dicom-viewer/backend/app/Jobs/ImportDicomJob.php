<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\DicomService;
use Illuminate\Support\Facades\Log;
use Exception;

class ImportDicomJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $fullPath;

    /**
     * Create a new job instance.
     */
    public function __construct(string $fullPath)
    {
        $this->fullPath = $fullPath;
    }

    /**
     * Execute the job.
     */
    public function handle(DicomService $dicomService): void
    {
        try {
            $dicomService->importDicom($this->fullPath);
            Log::info("Successfully imported DICOM from queue: " . $this->fullPath);
        } catch (Exception $e) {
            Log::error("Failed to import DICOM in queue: " . $e->getMessage());
            $this->fail($e);
        }
    }
}
