<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustHosts as Middleware;

final class TrustHosts extends Middleware
{
    public function hosts(): array
    {
        return config('security.trusted_hosts', []);
    }
}
