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
            if (!Schema::hasColumn('patients', 'clinical_diagnosis')) {
                $table->text('clinical_diagnosis')->nullable()->after('clinical_notes');
            }
            if (!Schema::hasColumn('patients', 'icd10_code')) {
                $table->string('icd10_code', 20)->nullable()->index()->after('clinical_diagnosis');
            }
            if (!Schema::hasColumn('patients', 'icd10_name')) {
                $table->string('icd10_name')->nullable()->after('icd10_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['clinical_diagnosis', 'icd10_code', 'icd10_name']);
        });
    }
};
