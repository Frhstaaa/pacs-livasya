<?php

namespace App\Repositories;

use App\Models\DicomFile;

class DicomRepository
{
    /**
     * Create a new DICOM file record.
     *
     * @param array $data
     * @return DicomFile
     */
    public function create(array $data): DicomFile
    {
        return DicomFile::create($data);
    }
}
