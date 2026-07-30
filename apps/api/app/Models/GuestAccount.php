<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class GuestAccount extends Model
{
    protected $fillable = [
        'email',
        'password',
        'display_name',
        'email_verified_at',
        'is_active',
        'last_signed_in_at',
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
            'last_signed_in_at' => 'datetime',
        ];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(GuestSession::class);
    }
}
