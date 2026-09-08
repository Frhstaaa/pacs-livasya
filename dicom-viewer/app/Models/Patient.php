<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $fillable = [
        'name', 
        'medical_record_number', 
        'birth_date',
        'gender',
        'address',
        'nik',
        'satusehat_ihs_id',
        'satusehat_encounter_id',
        'satusehat_imaging_study_id',
        'satusehat_study_synced_at',
        'order_number',
        'requested_procedure',
        'referring_physician',
        'clinical_notes',
        'order_date',
        'order_status'
    ];

    protected $casts = [
        'satusehat_study_synced_at' => 'datetime',
        'order_date' => 'datetime',
    ];

    public function dicomFiles()
    {
        return $this->hasMany(DicomFile::class);
    }
}
