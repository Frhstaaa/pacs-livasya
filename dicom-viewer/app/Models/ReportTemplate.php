<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'title',
        'modality',
        'category',
        'content',
        'is_favorite',
    ];

    protected $casts = [
        'is_favorite' => 'boolean',
    ];

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * Scope for templates available to a doctor (global templates + doctor's personal templates)
     */
    public function scopeAvailableFor($query, $doctorId = null)
    {
        return $query->where(function ($q) use ($doctorId) {
            $q->whereNull('doctor_id');
            if ($doctorId) {
                $q->orWhere('doctor_id', $doctorId);
            }
        });
    }
}
