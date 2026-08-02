<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class StaffVerificationCode extends Model
{
    public const PURPOSE_EMAIL_BINDING = 'email_binding';

    public const PURPOSE_PASSWORD_CHANGE = 'password_change';

    protected $fillable = [
        'staff_user_id',
        'purpose',
        'destination_email',
        'code_hash',
        'attempt_count',
        'expires_at',
        'consumed_at',
    ];

    protected $hidden = [
        'code_hash',
    ];

    protected function casts(): array
    {
        return [
            'attempt_count' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class);
    }
}
