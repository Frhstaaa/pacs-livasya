<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the unique index to allow multi-file examinations for the same patient to share the same verification token
        try {
            DB::statement('DROP INDEX IF EXISTS reports_verification_token_unique');
        } catch (\Throwable $e) {
            // Index might not exist or might be managed differently by driver
        }

        try {
            DB::statement('CREATE INDEX IF NOT EXISTS reports_verification_token_index ON reports(verification_token)');
        } catch (\Throwable $e) {
            // Ignore if already created
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('DROP INDEX IF EXISTS reports_verification_token_index');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS reports_verification_token_unique ON reports(verification_token)');
        } catch (\Throwable $e) {
            // Ignore
        }
    }
};
