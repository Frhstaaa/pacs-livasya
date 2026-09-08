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
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'nik')) {
                $table->string('nik', 20)->nullable()->after('medical_record_number');
            }
            if (!Schema::hasColumn('patients', 'satusehat_ihs_id')) {
                $table->string('satusehat_ihs_id', 50)->nullable()->after('nik');
            }
            if (!Schema::hasColumn('patients', 'satusehat_encounter_id')) {
                $table->string('satusehat_encounter_id', 100)->nullable()->after('satusehat_ihs_id');
            }
            if (!Schema::hasColumn('patients', 'satusehat_imaging_study_id')) {
                $table->string('satusehat_imaging_study_id', 100)->nullable()->after('satusehat_encounter_id');
            }
            if (!Schema::hasColumn('patients', 'satusehat_study_synced_at')) {
                $table->dateTime('satusehat_study_synced_at')->nullable()->after('satusehat_imaging_study_id');
            }
        });

        Schema::table('reports', function (Blueprint $table) {
            if (!Schema::hasColumn('reports', 'satusehat_report_id')) {
                $table->string('satusehat_report_id', 100)->nullable()->after('verification_token');
            }
            if (!Schema::hasColumn('reports', 'satusehat_report_synced_at')) {
                $table->dateTime('satusehat_report_synced_at')->nullable()->after('satusehat_report_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'nik',
                'satusehat_ihs_id',
                'satusehat_encounter_id',
                'satusehat_imaging_study_id',
                'satusehat_study_synced_at'
            ]);
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn([
                'satusehat_report_id',
                'satusehat_report_synced_at'
            ]);
        });
    }
};
