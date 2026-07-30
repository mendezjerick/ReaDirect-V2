<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class GuestSession extends Model
{
    protected $fillable = [
        'guest_account_id',
        'token_hash',
        'last_used_at',
        'expires_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function guestAccount(): BelongsTo
    {
        return $this->belongsTo(GuestAccount::class);
    }
}
