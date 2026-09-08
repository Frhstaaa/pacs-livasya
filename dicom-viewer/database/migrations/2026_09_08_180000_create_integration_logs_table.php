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
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->id();
            $table->string('system'); // 'satusehat' or 'simrs'
            $table->string('resource_type'); // 'DiagnosticReport', 'ImagingStudy', 'OrderSync', 'PingHandshake'
            $table->string('endpoint')->nullable();
            $table->string('patient_mrn')->nullable();
            $table->string('patient_name')->nullable();
            $table->string('study_instance_uid')->nullable();
            $table->string('status'); // 'success', 'failed', 'pending'
            $table->integer('status_code')->nullable(); // e.g. 200, 201, 400, 500
            $table->integer('latency_ms')->nullable(); // response time in ms
            $table->longText('request_payload')->nullable();
            $table->longText('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
    }
};
