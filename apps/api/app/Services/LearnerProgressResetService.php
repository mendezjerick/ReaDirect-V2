<?php

namespace App\Services;

use App\Models\AssessmentResponse;
use App\Models\AssessmentRun;
use App\Models\Learner;
use App\Models\LearnerAchievement;
use App\Models\LearnerPortalRun;
use App\Models\LearnerProgressState;
use App\Models\LearnerSession;
use App\Models\LessonResponse;
use App\Models\LessonRun;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class LearnerProgressResetService
{
    public function reset(Learner $learner, StaffUser $actor): Learner
    {
        return DB::transaction(function () use ($learner, $actor): Learner {
            $resetAt = now();

            LearnerSession::query()
                ->where('learner_id', $learner->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => $resetAt]);

            LearnerPortalRun::query()
                ->where('learner_id', $learner->id)
                ->where('status', LearnerPortalRun::ACTIVE_STATUS)
                ->update([
                    'status' => 'reset',
                    'ended_at' => $resetAt,
                ]);

            $assessmentRunIds = AssessmentRun::query()
                ->where('learner_id', $learner->id)
                ->pluck('id');
            $assessmentAudioPaths = AssessmentResponse::query()
                ->whereIn('assessment_run_id', $assessmentRunIds)
                ->whereNotNull('audio_path')
                ->pluck('audio_path')
                ->all();
            Storage::disk('local')->delete($assessmentAudioPaths);
            AssessmentRun::query()->whereIn('id', $assessmentRunIds)->delete();

            $lessonRunIds = LessonRun::query()->where('learner_id', $learner->id)->pluck('id');
            $lessonAudioPaths = LessonResponse::query()
                ->whereIn('lesson_run_id', $lessonRunIds)
                ->whereNotNull('audio_path')
                ->pluck('audio_path')->all();
            Storage::disk('local')->delete($lessonAudioPaths);
            LessonRun::query()->whereIn('id', $lessonRunIds)->delete();
            DB::table('lesson_target_exposures')->where('learner_id', $learner->id)->delete();
            LearnerAchievement::query()->where('learner_id', $learner->id)->delete();

            LearnerProgressState::query()->updateOrCreate(
                ['learner_id' => $learner->id],
                [
                    'stage' => LearnerProgressState::BASELINE_STAGE,
                    'current_required_lesson_order' => null,
                    'diagnostic_completed_at' => null,
                    'final_assessment_completed_at' => null,
                    'last_confirmed_at' => $resetAt,
                ],
            );

            $learner->forceFill(['progress_reset_at' => $resetAt])->save();

            StaffAuditLog::query()->create([
                'staff_user_id' => $actor->id,
                'action_key' => 'portal_system_learner.progress_reset',
                'description' => "Reset portal system Learner {$learner->learner_code} to before the Diagnostic Assessment.",
                'metadata' => [
                    'learner_id' => $learner->id,
                    'learner_code' => $learner->learner_code,
                ],
            ]);

            return $learner->fresh();
        });
    }
}
