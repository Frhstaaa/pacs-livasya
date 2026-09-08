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
            if (!Schema::hasColumn('patients', 'gender')) {
                $table->string('gender', 10)->nullable()->after('birth_date');
            }
            if (!Schema::hasColumn('patients', 'address')) {
                $table->text('address')->nullable()->after('gender');
            }
            if (!Schema::hasColumn('patients', 'order_number')) {
                $table->string('order_number')->nullable()->index()->after('address');
            }
            if (!Schema::hasColumn('patients', 'requested_procedure')) {
                $table->string('requested_procedure')->nullable()->after('order_number');
            }
            if (!Schema::hasColumn('patients', 'referring_physician')) {
                $table->string('referring_physician')->nullable()->after('requested_procedure');
            }
            if (!Schema::hasColumn('patients', 'clinical_notes')) {
                $table->text('clinical_notes')->nullable()->after('referring_physician');
            }
            if (!Schema::hasColumn('patients', 'order_date')) {
                $table->dateTime('order_date')->nullable()->after('clinical_notes');
            }
            if (!Schema::hasColumn('patients', 'order_status')) {
                $table->string('order_status')->default('pending_image')->index()->after('order_date');
            }
        });

        Schema::table('dicom_files', function (Blueprint $table) {
            if (!Schema::hasColumn('dicom_files', 'accession_number')) {
                $table->string('accession_number')->nullable()->index()->after('modality');
            }
            if (!Schema::hasColumn('dicom_files', 'order_number')) {
                $table->string('order_number')->nullable()->index()->after('accession_number');
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
                'gender',
                'address',
                'order_number',
                'requested_procedure',
                'referring_physician',
                'clinical_notes',
                'order_date',
                'order_status'
            ]);
        });

        Schema::table('dicom_files', function (Blueprint $table) {
            $table->dropColumn(['accession_number', 'order_number']);
        });
    }
};
