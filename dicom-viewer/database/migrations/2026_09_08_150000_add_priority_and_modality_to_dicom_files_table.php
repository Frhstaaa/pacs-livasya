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
        Schema::table('dicom_files', function (Blueprint $table) {
            if (!Schema::hasColumn('dicom_files', 'priority')) {
                $table->string('priority')->default('regular')->after('file_path'); // 'regular', 'cito'
            }
            if (!Schema::hasColumn('dicom_files', 'modality')) {
                $table->string('modality')->default('DX')->after('priority'); // 'DX', 'CR', 'CT', 'MR', 'US', 'PX'
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dicom_files', function (Blueprint $table) {
            $table->dropColumn(['priority', 'modality']);
        });
    }
};
