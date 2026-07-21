<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class EquivalenceRule extends Model
{
    protected $fillable = [
        'rule_type',
        'expected_text',
        'recognized_text',
        'scope',
        'item_key',
        'notes',
        'is_active',
        'created_by_staff_user_id',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(StaffUser::class, 'created_by_staff_user_id');
    }
}
