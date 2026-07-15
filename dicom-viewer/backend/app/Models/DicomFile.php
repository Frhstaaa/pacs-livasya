<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DicomFile extends Model
{
    protected $fillable = ['patient_id', 'uuid', 'file_name', 'file_path'];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function report()
    {
        return $this->hasOne(Report::class);
    }
}
