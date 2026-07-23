<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LearnerAchievement extends Model
{
    protected $fillable = ['learner_id', 'achievement_key', 'awarded_at', 'evidence'];

    protected function casts(): array
    {
        return ['awarded_at' => 'datetime', 'evidence' => 'array'];
    }
}
