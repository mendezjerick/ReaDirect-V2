<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemAdminLearningContentService;
use Illuminate\Http\JsonResponse;

final class SystemAdminLearningContentController extends Controller
{
    public function __construct(
        private readonly SystemAdminLearningContentService $learningContent,
    ) {}

    public function assessments(): JsonResponse
    {
        return response()->json($this->learningContent->assessments());
    }

    public function lessons(): JsonResponse
    {
        return response()->json($this->learningContent->lessons());
    }

    public function rules(): JsonResponse
    {
        return response()->json($this->learningContent->rules());
    }
}
