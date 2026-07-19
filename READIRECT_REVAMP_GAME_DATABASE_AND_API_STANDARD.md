# ReaDirect Game Database and API Standard

This standard defines how the lobby, game-one, and game-two persist player
identity, sessions, saves, progression, results, leaderboards, and achievements.
It is mandatory because independently developed game data must merge into the
main ReaDirect PostgreSQL database without manual reconstruction.

## One Database and One Schema

All game data uses:

```text
PostgreSQL database: readirect
PostgreSQL schema:   readirect_v2
Connection owner:    apps/api Laravel application
```

A game-specific database means game-specific tables inside this shared database
and schema. It never means:

- A separate PostgreSQL database.
- A second PostgreSQL schema.
- A contributor-hosted database.
- A direct browser database connection.
- A Firebase, Supabase, SQLite, or localStorage source of truth.
- A pgAdmin export or SQL dump used instead of Laravel migrations.

All reads and writes pass through authenticated Laravel endpoints and Eloquent
or approved Laravel query code.

## Identity Rule

Registered learners authenticate with their unique learner code. Verified
guests authenticate with their registered email address. These are login
identifiers, not game foreign keys.

```text
Learner Code + password       Verified email + password
          |                              |
          v                              v
 internal learner ID             internal guest ID
          |                              |
          +------------+-----------------+
                       |
             +---------+---------+
             |                   |
             v                   v
      game profile ID     account achievements
             |
       +-----+------+-----------+
       |            |           |
       v            v           v
    sessions      saves       results
```

Game tables reference game_profile_id or another centrally approved internal
key. They must never use learner code, email, username text, or discriminator as
a foreign key.

The common game-profile migration is created by the main ReaDirect owner after
the learner and guest account tables are finalized. It must retain real foreign
keys to exactly one authenticated owner. Contributors must not invent, replace,
or modify the learner or guest identity tables.

## Audience Separation

Every normal game profile has an immutable audience:

```text
learner
guest
```

The audience is derived by Laravel from the authenticated account and cannot be
selected by the client.

- Learner leaderboards contain learners only.
- Guest leaderboards contain verified guests only.
- Guest game records remain separate from real-learner educational progression.
- Administrative learner educational statistics exclude guests.
- Both audiences may save games, earn game achievements, retain personal bests,
  and appear in their own audience leaderboard.

## Data Ownership Model

### Core-owned tables

The main ReaDirect system owns the common contracts and migrations for:

- game_catalog
- game_profiles
- game_sessions
- game_saves
- game_progress
- game_results
- achievement_catalog
- account_achievements

Contributors consume these records through services and APIs. They must not
alter these tables in their migrations.

### Game-owned tables

A game may create tables for mechanics not represented by the common contract,
such as:

```text
word_quest_inventory
word_quest_completed_quests
sound_trail_collected_items
```

Every game-owned table:

- Starts with the permanent game key converted to snake_case.
- Is created through the module's Laravel migrations.
- References game_profile_id, game_session_id, game_save_id, or another
  approved core key.
- Includes only data required by that game.
- Has documented indexes, uniqueness, retention, and deletion behavior.
- Is included in the game design specification before implementation.

Generic names such as scores, users, progress, levels, sessions, or results are
prohibited for game-owned tables.

## Logical Core Schema

The following fields define the common contract. The final Laravel migrations
may add operational fields, but they must preserve these meanings.

### game_catalog

- id: internal key.
- game_key: permanent lowercase kebab-case key, globally unique.
- display_title: learner-facing title.
- slot: game-one or game-two, unique while active.
- engine: kaplay or pixi.
- contract_version: supported module contract.
- current_ruleset_version: active ranking rules.
- has_meaningful_progression: boolean.
- is_active: controls lobby availability.
- timestamps.

### game_profiles

- id: public game-data owner key.
- audience: learner or guest.
- learner_id: nullable unique foreign key.
- guest_id: nullable unique foreign key.
- username: original approved base username.
- username_normalized: lowercase moderation and lookup form.
- discriminator: generated numeric discriminator.
- username_changed_at: cooldown source.
- is_active: leaderboard and play eligibility.
- timestamps.

A database check must require exactly one of learner_id or guest_id. The public
handle is username plus # plus discriminator. The unique constraint covers the
normalized username and discriminator pair.

The base username:

- Contains 3 to 10 ASCII letters and numbers.
- Is moderated case-insensitively by the central Laravel rule.
- Has no spaces, punctuation, or arbitrary Unicode.
- Has a generated discriminator outside the 10-character limit.
- Can change only after a rolling 24-hour cooldown.

Username changes do not duplicate a profile and do not move scores,
achievements, saves, or sessions. Leaderboard responses render the profile's
current public handle.

### game_sessions

- id: internal session key.
- public_id: unguessable API identifier.
- game_profile_id: owning profile.
- game_id: catalog relationship.
- mode_key: permanent game-defined mode.
- difficulty_key: nullable permanent difficulty.
- ruleset_version: immutable for the session.
- content_version: content used for verification.
- status: started, completed, abandoned, or invalidated.
- started_at.
- completed_at: nullable.
- duration_ms: nullable nonnegative integer.
- idempotency_key: unique completion protection.
- server_context: limited JSONB needed for verification.
- timestamps.

Every normal game run creates a session, including simple games without saves.
A refresh may abandon a simple active run, but it does not delete previous
completed sessions.

System Administrator preview must not create a normal game_sessions row.

### game_saves

- id: internal save key.
- game_profile_id.
- game_id.
- checkpoint_key.
- save_schema_version.
- state: validated JSONB.
- revision: optimistic-concurrency integer.
- saved_at.
- timestamps.

A unique constraint on game_profile_id and game_id enforces one save slot per
player and game.

Save requirements:

- Checkpoints are automatic and documented.
- The server validates state shape and size.
- The payload is versioned and migratable.
- The payload contains no learner code, email, password, username, trusted
  reward, trusted score, or arbitrary executable content.
- A default uncompressed payload limit of 256 KiB applies unless the owner
  approves a documented exception.
- A checkpoint response is successful only after the database transaction
  commits.

New Game replaces the active save and resets only approved game progression. It
does not delete achievements, results, personal bests, or historical sessions.

### game_progress

- id.
- game_profile_id.
- game_id.
- progress_schema_version.
- progress_state: validated JSONB or approved common scalar fields.
- last_session_id: nullable.
- reset_at: nullable.
- timestamps.

The unique key is game_profile_id plus game_id. Long-term game progression is
separate from both the current checkpoint and educational lesson progression.

### game_results

- id.
- game_session_id: unique.
- game_profile_id.
- game_id.
- mode_key.
- difficulty_key: nullable.
- ruleset_version.
- rank_value: integer used for deterministic ordering.
- display_value: validated result representation.
- duration_ms: nullable.
- achieved_at: immutable server time.
- verification_status: verified or invalidated.
- verification_evidence: limited JSONB for audit.
- timestamps.

Floating-point values must not be used for ranking. Decimal measurements are
stored as scaled integers with the scale documented by the game.

The game design defines whether a higher or lower rank_value is better. An
exact tie is ordered by achieved_at ascending, so the result recorded first is
higher.

### achievement_catalog

- id.
- achievement_key: permanent globally unique key.
- source_type: lesson or game.
- source_key: lesson or permanent game key.
- name: learner-facing achievement name.
- unlock_criteria: visible learner-facing criteria.
- display_order: unique fixed gallery position.
- placeholder_asset_key: central star placeholder.
- earned_asset_key: future owner-created pixel-art asset.
- is_active.
- timestamps.

Contributors must provide the achievement name and exact unlock criteria. The
main owner assigns the permanent key, fixed ordering, and artwork.

### account_achievements

- id.
- account owner key supplied by the central authentication model.
- achievement_id.
- source_session_id: nullable for non-game achievements.
- earned_at.
- acknowledged_at: nullable.
- award_evidence: limited JSONB.
- timestamps.

The account owner is a real learner or verified guest identity, not an email,
learner code, username, or game-profile text field. The main owner defines the
final foreign key after the shared learner and guest identity migrations land.
It must retain database-enforced ownership and audience separation.

A unique constraint on account owner and achievement_id ensures an achievement
is earned once. Account-level ownership allows lesson achievements to exist
before the player creates a game username or first enters the lobby.

Unacknowledged rows form the lobby presentation queue. Ordering is earned_at
ascending, then id ascending. Acknowledging one achievement updates only that
row. Closing the lobby leaves every remaining row unacknowledged.

## Achievement Transaction

The trusted completion operation runs in one database transaction:

1. Lock or verify the active session.
2. Validate the game evidence.
3. Create exactly one verified result.
4. Update the personal-best projection or query source.
5. Apply approved game progression.
6. Evaluate declared achievement criteria.
7. Insert newly earned achievements with conflict-safe uniqueness.
8. Mark the session completed.
9. Commit before returning success.

The client may display only achievements returned by the committed response.
It must not award an achievement locally.

## Leaderboard Contract

A leaderboard partition is:

```text
game
+ audience
+ mode
+ optional difficulty
+ ruleset version
```

Rules:

- Learner and guest partitions are always separate.
- The response contains the top 10 profiles.
- A profile occupies at most one row through its best verified result.
- Invalidated and preview results are excluded.
- Deactivated profiles are excluded.
- The game's declared direction determines rank_value ordering.
- Exact rank ties use achieved_at ascending.
- Database id provides a final deterministic internal order if timestamps are
  equal.
- Public output contains only rank, public handle, and approved game result.

The API must not return learner codes, guest emails, passwords, verification
data, full names, school, grade, section, internal profile IDs, or save state.

Changing a username changes the rendered public handle of historical bests; it
does not rewrite ownership or result evidence.

## Server-Authoritative Scoring

Each GAME_DESIGN.md defines how Laravel verifies a completion. Acceptable
strategies include:

- Server-issued content and deterministic answer validation.
- Server-issued random seed plus submitted event summary.
- Server-known objectives and bounded timing evidence.
- Server-side calculation from submitted choices or completed tasks.

The client must not be trusted merely because it submits score, duration, or an
achievement flag. Laravel recalculates or bounds the result and rejects
impossible, stale, duplicate, mismatched, or unauthorized completions.

Game-specific verification belongs in a namespaced service such as:

```text
ReaDirect\Games\WordQuest\Services\VerifyWordQuestResult
```

## Required API Shape

Exact controller names may follow application conventions, but the semantic
routes remain:

```text
GET    /api/learner/games
GET    /api/learner/games/profile
POST   /api/learner/games/profile
PATCH  /api/learner/games/profile/username

GET    /api/learner/games/leaderboards
GET    /api/learner/games/achievements
POST   /api/learner/games/achievements/<achievement>/acknowledge

POST   /api/learner/games/<game-key>/sessions
GET    /api/learner/games/<game-key>/save
PUT    /api/learner/games/<game-key>/save
POST   /api/learner/games/<game-key>/new-game
POST   /api/learner/games/<game-key>/sessions/<session>/complete
```

The learner prefix is the learner-facing application area and also serves
verified guests after their guest session is resolved. Authorization derives
the actual audience.

Game-specific routes remain below:

```text
/api/learner/games/<game-key>/...
```

They must not create parallel username, session, save, result, leaderboard, or
achievement APIs.

## Idempotency and Concurrency

- Session completion requires a unique idempotency key.
- Repeating the same valid completion returns the original committed result.
- Reusing a key for different evidence is rejected.
- Save writes include the last known revision.
- Stale revisions are rejected or explicitly reconciled; silent overwrite is
  prohibited.
- Achievement insertion uses database uniqueness, not a check-then-insert race.
- Personal-best calculation occurs transactionally or through a deterministic
  query over verified results.

## Laravel Migration Rules

Contributors deliver schema changes only as Laravel migrations under:

```text
apps/games/<slot>/backend/database/migrations/
```

Every migration:

- Has a unique timestamped filename and descriptive action.
- Creates only approved, namespaced game tables.
- Has a complete reversible down method.
- Uses the configured PostgreSQL connection and readirect_v2 search path.
- Uses foreign keys to existing approved internal IDs.
- Declares null behavior and deletion behavior explicitly.
- Adds indexes for foreign keys and expected filters.
- Adds unique constraints for business invariants.
- Uses JSONB only for bounded, versioned game-specific state.
- Stores ranked numeric data as integers, not floats.
- Uses Laravel timestamps consistently with the main application.
- Avoids raw SQL unless PostgreSQL behavior cannot be expressed safely through
  the schema builder and the owner approves it.

A contributor migration must never:

- Create or alter learner, guest, staff, school, lesson, reward, or shared game
  tables.
- Rename or drop a shared column, index, constraint, or table.
- Create a database, schema, role, extension, trigger, or scheduled job.
- Insert production player data.
- Depend on a local pgAdmin action.
- Modify a migration already applied in a shared environment.

The maintainer assigns final migration ordering during integration. If a shared
core table is missing, the game migration waits; it must not create a temporary
replacement.

## Migration Verification

Before acceptance, the game migrations must pass:

1. Fresh PostgreSQL schema migration.
2. Migration on a current main-system schema snapshot.
3. Game feature tests with foreign-key enforcement.
4. Rollback of the game migration batch.
5. Re-migration after rollback.
6. Coexistence with both game slots installed.
7. Duplicate, stale-save, duplicate-achievement, and duplicate-completion tests.
8. Confirmation that no shared table changed unexpectedly.

Database dumps are test inputs or backups only; they are never accepted as the
schema implementation.

## System Administrator Player Database

The System Administrator sidebar includes a dedicated read-only game-player
database. Learners and guests are presented in separate views.

Authorized inspection may show:

- Account type and approved account identity fields.
- Current public game handle and username cooldown time.
- Game sessions and statuses.
- Current save and progression metadata.
- Personal bests and leaderboard positions.
- Earned achievements and acknowledgement state.
- Account active or deactivated state.

Passwords, password hashes, email verification codes, authentication tokens,
and private credentials are never displayed.

Preview data is disposable and excluded. The initial feature is read-only;
reset, edit, delete, restore, impersonate, and score-changing actions require a
separate future authorization and audit specification.

## Deactivation and Retention

When a learner or guest account is deactivated:

- New game sessions are denied.
- Its public handle and results disappear from leaderboards.
- Existing sessions, saves, progression, results, and achievements remain
  available to authorized System Administrators.
- Historical ownership remains attached to the internal profile.

Permanent deletion or anonymization is a separate controlled operation and must
define foreign-key, audit, and reporting consequences before implementation.

## Security and Privacy Checklist

- [ ] Authentication is resolved by Laravel.
- [ ] The browser never chooses its audience or trusted owner ID.
- [ ] Learner codes and guest emails never appear in leaderboard responses.
- [ ] Username moderation is central and case-insensitive.
- [ ] Every write is authorized for the active game profile.
- [ ] Saves have schema version, size limit, and validation.
- [ ] Scores are recalculated or strongly verified by the server.
- [ ] Completion and achievement writes are idempotent.
- [ ] Learner and guest leaderboards cannot mix.
- [ ] Preview and deactivated profiles cannot rank.
- [ ] Game-specific tables use approved prefixes and foreign keys.
- [ ] No contributor migration changes a shared table.
- [ ] Logs and JSON evidence contain no passwords, tokens, raw email addresses,
      or unnecessary learner data.
