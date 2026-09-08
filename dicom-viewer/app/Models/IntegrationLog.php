<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IntegrationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'system',
        'resource_type',
        'endpoint',
        'patient_mrn',
        'patient_name',
        'study_instance_uid',
        'status',
        'status_code',
        'latency_ms',
        'request_payload',
        'response_payload',
        'error_message',
    ];

    protected $casts = [
        'status_code' => 'integer',
        'latency_ms' => 'integer',
    ];
}
