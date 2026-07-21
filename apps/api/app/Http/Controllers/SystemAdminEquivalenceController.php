<?php

namespace App\Http\Controllers;

use App\Models\EquivalenceRule;
use App\Models\StaffAuditLog;
use App\Models\StaffUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SystemAdminEquivalenceController extends Controller
{
    public function index(StaffUser $staffUser): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);

        $rules = EquivalenceRule::query()
            ->with('createdBy:id,display_name')
            ->latest('id')
            ->get()
            ->map(fn (EquivalenceRule $rule): array => [
                'id' => $rule->id,
                'rule_type' => $rule->rule_type,
                'expected_text' => $rule->expected_text,
                'recognized_text' => $rule->recognized_text,
                'scope' => $rule->scope,
                'item_key' => $rule->item_key,
                'notes' => $rule->notes,
                'is_active' => $rule->is_active,
                'created_by' => $rule->createdBy?->display_name ?? 'System Administrator',
                'created_at' => $rule->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'rules' => $rules,
            'summary' => [
                'total' => $rules->count(),
                'active' => $rules->where('is_active', true)->count(),
                'inactive' => $rules->where('is_active', false)->count(),
            ],
        ]);
    }

    public function update(Request $request, StaffUser $staffUser, EquivalenceRule $equivalenceRule): JsonResponse
    {
        $this->assertSystemAdministrator($staffUser);
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);

        $equivalenceRule->update(['is_active' => $validated['is_active']]);

        StaffAuditLog::query()->create([
            'staff_user_id' => $staffUser->id,
            'action_key' => 'equivalence_rule.status_updated',
            'description' => sprintf(
                '%s a %s Equivalence Book rule.',
                $equivalenceRule->is_active ? 'Enabled' : 'Disabled',
                $equivalenceRule->rule_type,
            ),
            'metadata' => [
                'equivalence_rule_id' => $equivalenceRule->id,
                'is_active' => $equivalenceRule->is_active,
            ],
        ]);

        return response()->json([
            'rule' => [
                'id' => $equivalenceRule->id,
                'is_active' => $equivalenceRule->is_active,
            ],
        ]);
    }

    private function assertSystemAdministrator(StaffUser $staffUser): void
    {
        if ($staffUser->role !== 'system_admin' || ! $staffUser->is_active) {
            abort(404);
        }
    }
}
