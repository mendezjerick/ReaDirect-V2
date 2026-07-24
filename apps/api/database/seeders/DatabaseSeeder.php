<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SystemAdministratorSeeder::class);
        $this->call(LetterEquivalenceSeeder::class);
        $this->call(CvcVowelEquivalenceSeeder::class);
        $this->call(PortalSystemLearnerSeeder::class);
        $this->call(TtsSpeechCatalogSeeder::class);
    }
}
