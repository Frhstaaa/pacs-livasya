<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = ['dicom_file_id', 'doctor_id', 'content'];

    public function dicomFile()
    {
        return $this->belongsTo(DicomFile::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
