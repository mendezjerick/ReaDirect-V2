<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class StaffUser extends Model
{
    protected $fillable = [
        'username',
        'email',
        'email_verified_at',
        'password',
        'role',
        'school_id',
        'grade_level',
        'section',
        'teacher_assignment_acknowledged_at',
        'display_name',
        'is_active',
        'requires_credential_setup',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'requires_credential_setup' => 'boolean',
            'grade_level' => 'integer',
            'teacher_assignment_acknowledged_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(StaffAuditLog::class);
    }

    public function learners(): HasMany
    {
        return $this->hasMany(Learner::class, 'teacher_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(StaffSession::class);
    }
}
