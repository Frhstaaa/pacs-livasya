<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (!Schema::hasColumn('reports', 'simrs_sync_status')) {
                $table->string('simrs_sync_status', 30)->nullable()->default('pending')->after('satusehat_report_synced_at');
            }
            if (!Schema::hasColumn('reports', 'simrs_synced_at')) {
                $table->dateTime('simrs_synced_at')->nullable()->after('simrs_sync_status');
            }
            if (!Schema::hasColumn('reports', 'simrs_response')) {
                $table->text('simrs_response')->nullable()->after('simrs_synced_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn([
                'simrs_sync_status',
                'simrs_synced_at',
                'simrs_response',
            ]);
        });
    }
};
