FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libzip-dev \
        postgresql-client \
        unzip \
    && docker-php-ext-install \
        bcmath \
        intl \
        mbstring \
        pcntl \
        pdo_pgsql \
        sockets \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /opt/readirect/apps/api

COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts

COPY apps/api ./
COPY content /opt/readirect/content

RUN mkdir -p \
        bootstrap/cache \
        storage/app/private \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
    && chmod -R ug+rwX bootstrap/cache storage \
    && chmod +x docker/pilot-entrypoint.sh \
    && composer dump-autoload --no-dev --classmap-authoritative

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

EXPOSE 10000

CMD ["./docker/pilot-entrypoint.sh"]
