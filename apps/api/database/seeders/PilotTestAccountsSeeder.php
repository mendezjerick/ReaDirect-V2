<?php

namespace Database\Seeders;

use App\Models\Learner;
use App\Models\LearnerProgressState;
use App\Models\School;
use App\Models\StaffUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

final class PilotTestAccountsSeeder extends Seeder
{
    private const SCHOOL_NAME = 'ReaDirect Pilot Evaluation School';

    /** @var array<string, string> */
    private const STAFF_PASSWORD_HASHES = [
        'pilot.school.admin' => '$2y$12$03OQotSO8KobiSVzBrQjIOeMNyMdEToDlKOMy4QZ79I18yTQI.AWW',
        'pilot.teacher.a' => '$2y$12$IReRb5yZkrSpKtcviMriH.AKx61XPLf1TNxOzGJGLL49KGo8DSGPi',
        'pilot.teacher.b' => '$2y$12$dtZD1eHCnr8.VuDN26.68O5dfuWyfECg2qVHOQ0ik8j8F1vvxx2KC',
    ];

    /** @var array<string, string> */
    private const READER_PASSWORD_HASHES = [
        'IT001' => '$2y$12$rwsUNuiiqQHRYIbc01oWH./ueORwRAvrH/vQ8d7nA.u6mfpqzDXRK',
        'IT002' => '$2y$12$bOnbqoultPwzFODlPNA6muLL/BO64WfdsYyoaZUWqxm5.yjjVu..q',
        'IT003' => '$2y$12$51KJt9fVGIUnBGEPklqNXOFdObjQGj1tW7bpi2lio89g3MjJcuSti',
        'IT004' => '$2y$12$OvykYLFCeuBFeGJYUuT68uEolsXut.3NbFqBe8i.gr9nLK/8MMav2',
        'IT005' => '$2y$12$Mr68/7n2Ae4IjIojm56B1ebYyoA10JnqEtGy2KKW2SPqE2T5ipaBy',
        'IT006' => '$2y$12$qXALaqtlsydxGWA1C7.A9.YJn540eO9VBsXSLuhwrSJxBPUKiNwc6',
        'IT007' => '$2y$12$HlEcy7kv07.Rc6yImI5nVuWDvX0vvaLV/WDAX1qqXAb2VNTMPwCBm',
        'IT008' => '$2y$12$Q3/w8v0eoyC5rSxL1pfk6eKA6owH/IemdSn8uUccv.nywbagoJmCq',
        'IT009' => '$2y$12$YDlfOFXqCCVxQBwlBxO4TejcItshyZdsfQG.b7E4PPb3mUS8aVpLq',
        'IT010' => '$2y$12$x5nvfusMjZ5/xkB2jKfjK.B5TKlvC.3UyH5JdOIrrK4z6agYnee1y',
    ];

    public function run(): void
    {
        $school = School::query()->updateOrCreate(
            ['normalized_name' => mb_strtolower(self::SCHOOL_NAME)],
            ['name' => self::SCHOOL_NAME],
        );

        $administrator = StaffUser::query()->updateOrCreate(
            ['username' => 'pilot.school.admin'],
            [
                'password' => bin2hex(random_bytes(32)),
                'role' => 'school_admin',
                'school_id' => $school->id,
                'grade_level' => null,
                'section' => null,
                'teacher_assignment_acknowledged_at' => null,
                'display_name' => 'Pilot School Administrator',
                'is_active' => true,
                'requires_credential_setup' => false,
            ],
        );
        $this->storeStaffPasswordHash(
            $administrator,
            self::STAFF_PASSWORD_HASHES['pilot.school.admin'],
        );

        $teachers = [
            'A' => $this->seedTeacher($school, 'pilot.teacher.a', 'Pilot Teacher A', 'Pilot A'),
            'B' => $this->seedTeacher($school, 'pilot.teacher.b', 'Pilot Teacher B', 'Pilot B'),
        ];

        foreach (self::READER_PASSWORD_HASHES as $code => $passwordHash) {
            $number = (int) substr($code, 2);
            $group = $number <= 5 ? 'A' : 'B';
            $section = "Pilot {$group}";
            $learner = Learner::query()->updateOrCreate(
                ['learner_code' => $code],
                [
                    'account_purpose' => Learner::PURPOSE_STANDARD,
                    'speech_language' => 'en',
                    'password' => bin2hex(random_bytes(32)),
                    'first_name' => 'Pilot',
                    'middle_name' => 'IT',
                    'last_name' => sprintf('Reader %02d', $number),
                    'suffix' => null,
                    'lrn' => null,
                    'school_id' => $school->id,
                    'teacher_id' => $teachers[$group]->id,
                    'grade_level' => 3,
                    'section' => $section,
                    'is_active' => true,
                ],
            );
            DB::table('learners')
                ->where('id', $learner->id)
                ->update(['password' => $passwordHash]);

            LearnerProgressState::query()->firstOrCreate(
                ['learner_id' => $learner->id],
                ['stage' => LearnerProgressState::BASELINE_STAGE],
            );
        }
    }

    private function seedTeacher(
        School $school,
        string $username,
        string $displayName,
        string $section,
    ): StaffUser {
        $teacher = StaffUser::query()->updateOrCreate(
            ['username' => $username],
            [
                'password' => bin2hex(random_bytes(32)),
                'role' => 'teacher',
                'school_id' => $school->id,
                'grade_level' => 3,
                'section' => $section,
                'teacher_assignment_acknowledged_at' => now(),
                'display_name' => $displayName,
                'is_active' => true,
                'requires_credential_setup' => false,
            ],
        );
        $this->storeStaffPasswordHash($teacher, self::STAFF_PASSWORD_HASHES[$username]);

        return $teacher;
    }

    private function storeStaffPasswordHash(StaffUser $staffUser, string $passwordHash): void
    {
        DB::table('staff_users')
            ->where('id', $staffUser->id)
            ->update(['password' => $passwordHash]);
    }
}
