<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Test Nurse',
            'email' => 'nurse@pacs.com',
            'role' => 'nurse',
        ]);

        User::factory()->create([
            'name' => 'Test Doctor',
            'email' => 'doctor@pacs.com',
            'role' => 'doctor',
        ]);
    }
}
