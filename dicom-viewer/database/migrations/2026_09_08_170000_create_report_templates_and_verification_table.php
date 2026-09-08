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
        // 1. Report Templates Table
        Schema::create('report_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('modality', 16)->default('ALL'); // DX, CR, CT, MR, US, PX, ALL
            $table->string('category')->default('Umum'); // Thorax, Abdomen, Brain, Ekstremitas, Spine, dll
            $table->text('content');
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();
        });

        // 2. Add Verification & Digital Signature fields to reports table
        Schema::table('reports', function (Blueprint $table) {
            if (!Schema::hasColumn('reports', 'is_verified')) {
                $table->boolean('is_verified')->default(false)->after('content');
            }
            if (!Schema::hasColumn('reports', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('is_verified');
            }
            if (!Schema::hasColumn('reports', 'verification_token')) {
                $table->string('verification_token')->nullable()->unique()->after('verified_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_templates');

        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn(['is_verified', 'verified_at', 'verification_token']);
        });
    }
};
