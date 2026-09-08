<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $fillable = [
        'name', 
        'medical_record_number', 
        'birth_date',
        'nik',
        'satusehat_ihs_id',
        'satusehat_encounter_id',
        'satusehat_imaging_study_id',
        'satusehat_study_synced_at'
    ];

    protected $casts = [
        'satusehat_study_synced_at' => 'datetime',
    ];

    public function dicomFiles()
    {
        return $this->hasMany(DicomFile::class);
    }
}
