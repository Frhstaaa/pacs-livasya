<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'dicom_file_id', 
        'doctor_id', 
        'content', 
        'snapshot_path', 
        'annotation_state', 
        'viewport_state',
        'is_verified',
        'verified_at',
        'verification_token',
        'satusehat_report_id',
        'satusehat_report_synced_at'
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'satusehat_report_synced_at' => 'datetime',
    ];

    public function dicomFile()
    {
        return $this->belongsTo(DicomFile::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
