<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $fillable = ['name', 'medical_record_number', 'birth_date'];

    public function dicomFiles()
    {
        return $this->hasMany(DicomFile::class);
    }
}
