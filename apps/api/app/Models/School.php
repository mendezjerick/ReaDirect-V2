<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class School extends Model
{
    protected $fillable = [
        'name',
        'normalized_name',
    ];

    public function staffUsers(): HasMany
    {
        return $this->hasMany(StaffUser::class);
    }
}
