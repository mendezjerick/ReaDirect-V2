<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;

final class TrustProxies extends Middleware
{
    protected function proxies(): array
    {
        return config('security.trusted_proxies', []);
    }
}
