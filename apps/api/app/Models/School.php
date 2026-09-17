<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

final class School extends Model
{
    protected static function booted(): void
    {
        self::created(function (School $school): void {
            if (Schema::hasTable('school_years')) {
                SchoolYear::ensureInitial($school);
            }
        });
    }

    protected $fillable = [
        'name',
        'normalized_name',
    ];

    public function staffUsers(): HasMany
    {
        return $this->hasMany(StaffUser::class);
    }

    public function schoolYears(): HasMany
    {
        return $this->hasMany(SchoolYear::class);
    }
}
