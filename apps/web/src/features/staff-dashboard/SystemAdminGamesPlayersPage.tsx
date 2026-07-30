import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../../components/staff/MetricCard";
import { StaffBadge } from "../../components/staff/StaffBadge";
import { StaffBrandIcon } from "../../components/staff/StaffBrandIcon";
import { StaffButton } from "../../components/staff/StaffButton";
import { StaffCard } from "../../components/staff/StaffCard";
import { StaffWorkspacePage } from "../../components/staff/StaffContentPatterns";
import { StaffDataTable } from "../../components/staff/StaffDataTable";
import { StaffNotice } from "../../components/staff/StaffNotice";
import { StaffPageHeader } from "../../components/staff/StaffPageHeader";
import { StaffSectionHeader } from "../../components/staff/StaffSectionHeader";
import { StaffShell } from "../../components/staff/StaffShell";
import { StaffState } from "../../components/staff/StaffState";
import { systemAdminNavigationGroups } from "../../components/staff/staffNavigation";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import {
  clearStaffSession,
  getSystemAdminGamesAndPlayers,
} from "../staff-auth/staffApi";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never saved";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SystemAdminGamesPlayersPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [saveFilter, setSaveFilter] = useState("all");
  const directoryQuery = useQuery({
    queryKey: ["system-admin-operations", "games-and-players"],
    queryFn: getSystemAdminGamesAndPlayers,
  });
  const summary = directoryQuery.data?.summary;
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (directoryQuery.data?.players ?? []).filter((player) => {
      const matchesSaves =
        saveFilter === "all" ||
        (saveFilter === "with-saves" && player.saves.length > 0) ||
        (saveFilter === "without-saves" && player.saves.length === 0);
      const searchable = [
        player.handle,
        player.learner.learner_code,
        player.learner.full_name,
        player.learner.school_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesSaves &&
        (!normalizedSearch || searchable.includes(normalizedSearch))
      );
    });
  }, [directoryQuery.data?.players, saveFilter, search]);

  return (
    <StaffShell
      accountLabel="System Administrator"
      exitCommitting={exitCommit.committing}
      onExit={() =>
        exitCommit.commit(() => {
          clearStaffSession();
          navigate("/home");
        })
      }
      brandIcon={<StaffBrandIcon />}
      navigationGroups={systemAdminNavigationGroups}
    >
      <StaffWorkspacePage className="operations-page">
        <StaffPageHeader
          eyebrow="Operations"
          title="Games and players"
          description="Inspect the active game catalog, standard-Learner public handles, and save metadata without opening or changing private game state."
          badge={<StaffBadge tone="neutral">Read-only database</StaffBadge>}
        />

        <StaffNotice
          tone="neutral"
          title="Guest game persistence is not connected yet."
        >
          <span>
            This directory currently contains standard Learner profiles only.
            Portal preview data is excluded, and Guest players will remain
            separate when their persistence contract is implemented.
          </span>
        </StaffNotice>

        {directoryQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="The game-player database could not be loaded."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void directoryQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry.</span>
          </StaffNotice>
        ) : null}

        <section className="staff-metric-grid" aria-label="Game-player summary">
          <MetricCard
            label="Active games"
            value={
              summary
                ? `${summary.active_games}/${summary.catalog_games}`
                : null
            }
          />
          <MetricCard
            label="Player profiles"
            value={summary?.player_profiles ?? null}
          />
          <MetricCard
            label="Players with saves"
            value={summary?.players_with_saves ?? null}
          />
          <MetricCard label="Save slots" value={summary?.save_slots ?? null} />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Game registry"
            title="Catalog"
            description="Activation remains migration- and release-controlled."
          />
          {directoryQuery.isLoading ? (
            <StaffState compact title="Loading games…" />
          ) : null}
          {directoryQuery.data ? (
            <div className="operations-game-grid">
              {directoryQuery.data.games.map((game) => (
                <article key={game.id}>
                  <header>
                    <span>{game.slot.replace("-", " ")}</span>
                    <StaffBadge tone={game.is_active ? "success" : "muted"}>
                      {game.is_active ? "Active" : "Inactive"}
                    </StaffBadge>
                  </header>
                  <h3>{game.display_title}</h3>
                  <p>
                    {game.engine} · contract {game.contract_version} · rules{" "}
                    {game.ruleset_version}
                  </p>
                  <dl>
                    <div>
                      <dt>Saved players</dt>
                      <dd>{game.player_count}</dd>
                    </div>
                    <div>
                      <dt>Saves</dt>
                      <dd>{game.save_count}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : null}
        </StaffCard>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Standard Learners"
            title="Player database"
            description={directoryQuery.data?.governance.message}
            meta={
              <StaffBadge tone="neutral">
                {filteredPlayers.length} matching
              </StaffBadge>
            }
          />
          <div className="staff-directory-toolbar staff-directory-toolbar--filters">
            <TextField
              label="Search players"
              type="search"
              value={search}
              placeholder="Handle, Learner Code, name, or school"
              onChange={(event) => setSearch(event.target.value)}
            />
            <SelectField
              label="Save state"
              value={saveFilter}
              onChange={(event) => setSaveFilter(event.target.value)}
            >
              <option value="all">All players</option>
              <option value="with-saves">With saves</option>
              <option value="without-saves">Without saves</option>
            </SelectField>
          </div>

          {directoryQuery.data ? (
            <StaffDataTable
              accessibleLabel="System game players"
              rows={filteredPlayers}
              rowKey={(player) => player.id}
              empty={
                <StaffState
                  compact
                  title={
                    directoryQuery.data.players.length
                      ? "No players match these filters."
                      : "No standard Learners have created game profiles yet."
                  }
                />
              }
              columns={[
                {
                  key: "player",
                  label: "Player",
                  width: "minmax(9rem, 1fr)",
                  render: (player) => (
                    <span className="staff-data-table__primary">
                      <strong>{player.handle}</strong>
                      <small>
                        {player.is_active
                          ? "Active profile"
                          : "Inactive profile"}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "learner",
                  label: "Learner",
                  width: "minmax(11rem, 1.25fr)",
                  render: (player) => (
                    <span className="staff-data-table__primary">
                      <strong>{player.learner.full_name}</strong>
                      <small>
                        {player.learner.learner_code} ·{" "}
                        {player.learner.school_name ?? "School unavailable"}
                      </small>
                    </span>
                  ),
                },
                {
                  key: "saves",
                  label: "Save metadata",
                  width: "minmax(12rem, 1.4fr)",
                  render: (player) => {
                    const latestSave = player.saves[0];

                    return latestSave ? (
                      <span className="staff-data-table__primary">
                        <strong>{latestSave.game_title}</strong>
                        <small>
                          {latestSave.checkpoint_key} · revision{" "}
                          {latestSave.revision}
                        </small>
                      </span>
                    ) : (
                      "No saves"
                    );
                  },
                },
                {
                  key: "saved",
                  label: "Last saved",
                  width: "minmax(8rem, 0.8fr)",
                  render: (player) =>
                    formatDateTime(player.saves[0]?.saved_at ?? null),
                },
              ]}
            />
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
