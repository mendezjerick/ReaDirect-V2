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
  getSystemAdminPromptTemplates,
} from "../staff-auth/staffApi";

export function SystemAdminPromptTemplatesPage() {
  const navigate = useNavigate();
  const exitCommit = useButtonCommit();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [page, setPage] = useState(1);
  const templatesQuery = useQuery({
    queryKey: ["system-admin-agents-ai", "prompt-templates"],
    queryFn: getSystemAdminPromptTemplates,
  });
  const summary = templatesQuery.data?.summary;
  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return (templatesQuery.data?.templates ?? []).filter((template) => {
      const matchesGroup = group === "all" || template.group === group;
      const searchable = [
        template.speech_key,
        template.text,
        template.reference_role,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesGroup &&
        (!normalizedSearch || searchable.includes(normalizedSearch))
      );
    });
  }, [group, search, templatesQuery.data?.templates]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const visibleTemplates = filteredTemplates.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

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
      <StaffWorkspacePage className="agents-ai-page">
        <StaffPageHeader
          eyebrow="Agents and AI"
          title="Prompt templates"
          description="Inspect the approved fixed speech Ma'am Clara uses across assessments, lessons, and the optional companion class."
          badge={<StaffBadge tone="neutral">Read-only catalog</StaffBadge>}
        />

        <StaffNotice
          tone="neutral"
          title="No generative prompt registry is active."
        >
          <span>
            {templatesQuery.data?.governance.message ??
              "Loading the published fixed-speech catalog."}
          </span>
        </StaffNotice>

        {templatesQuery.isError ? (
          <StaffNotice
            tone="danger"
            title="Prompt templates could not be inspected."
            actions={
              <StaffButton
                size="compact"
                onClick={() => void templatesQuery.refetch()}
              >
                Retry
              </StaffButton>
            }
          >
            <span>Check the API connection, then retry.</span>
          </StaffNotice>
        ) : null}

        <section
          className="staff-metric-grid"
          aria-label="Prompt template summary"
        >
          <MetricCard
            label="Published templates"
            value={summary?.published_templates ?? null}
          />
          <MetricCard
            label="Catalog groups"
            value={summary?.groups.length ?? null}
          />
          <MetricCard
            label="Published voice"
            value={summary?.published_voice ?? null}
          />
          <MetricCard
            label="Generative registry"
            value={
              summary
                ? summary.generative_prompt_registry_configured
                  ? "Configured"
                  : "None"
                : null
            }
            detail="No generative prompt registry"
          />
        </section>

        <StaffCard padding="none">
          <StaffSectionHeader
            bordered
            eyebrow="Published Clara speech"
            title="Template catalog"
            description="Search by key, wording, or reference role."
            meta={
              <StaffBadge tone="neutral">
                {filteredTemplates.length} matching
              </StaffBadge>
            }
          />
          <div className="staff-directory-toolbar staff-directory-toolbar--filters">
            <TextField
              label="Search templates"
              type="search"
              value={search}
              placeholder="Speech key or wording"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <SelectField
              label="Template group"
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All groups</option>
              {summary?.groups.map((item) => (
                <option value={item.group} key={item.group}>
                  {item.group} ({item.published_templates})
                </option>
              ))}
            </SelectField>
          </div>

          {templatesQuery.isLoading ? (
            <StaffState compact title="Loading published templates…" />
          ) : null}

          {templatesQuery.data ? (
            <StaffDataTable
              accessibleLabel="Published Clara speech templates"
              rows={visibleTemplates}
              rowKey={(template) => template.speech_key}
              empty={
                <StaffState
                  compact
                  title="No templates match these filters."
                  description="Adjust the search or template group."
                />
              }
              columns={[
                {
                  key: "template",
                  label: "Template",
                  width: "minmax(11rem, 1fr)",
                  render: (template) => (
                    <span className="staff-data-table__primary">
                      <strong>{template.speech_key}</strong>
                      <small>{template.group}</small>
                    </span>
                  ),
                },
                {
                  key: "speech",
                  label: "Approved speech",
                  width: "minmax(16rem, 2fr)",
                  render: (template) => (
                    <span className="prompt-template-copy">
                      {template.text}
                    </span>
                  ),
                },
                {
                  key: "role",
                  label: "Reference role",
                  width: "minmax(6rem, 0.65fr)",
                  render: (template) => (
                    <StaffBadge tone="accent">
                      {template.reference_role}
                    </StaffBadge>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  width: "minmax(5rem, 0.5fr)",
                  render: (template) => (
                    <StaffBadge tone="success">{template.status}</StaffBadge>
                  ),
                },
              ]}
            />
          ) : null}

          {templatesQuery.data && filteredTemplates.length > pageSize ? (
            <div className="prompt-template-pagination">
              <span>
                Page {page} of {pageCount} · {filteredTemplates.length} matching
              </span>
              <div>
                <StaffButton
                  size="compact"
                  tone="quiet"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </StaffButton>
                <StaffButton
                  size="compact"
                  tone="secondary"
                  disabled={page === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                >
                  Next
                </StaffButton>
              </div>
            </div>
          ) : null}
        </StaffCard>
      </StaffWorkspacePage>
    </StaffShell>
  );
}
