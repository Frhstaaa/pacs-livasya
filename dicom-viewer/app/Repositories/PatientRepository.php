<?php

namespace App\Repositories;

use App\Models\Patient;

class PatientRepository
{
    /**
     * Find a patient by MRN or create a new one.
     *
     * @param string $mrn
     * @param array $data
     * @return Patient
     */
    public function firstOrCreateByMrn(string $mrn, array $data): Patient
    {
        return Patient::firstOrCreate(
            ['medical_record_number' => $mrn],
            $data
        );
    }
}
