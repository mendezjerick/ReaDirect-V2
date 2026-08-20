import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SpeechSandboxShell } from "../../components/staff/SpeechSandboxShell";
import { useSystemAdminSpeechSession } from "../../components/staff/useSystemAdminSpeechSession";
import { Surface } from "../../components/ui/Surface";
import { getRawConfusionMatrix } from "./speechSandboxApi";

const emptyToken = "__none__";

const taskLabels: Record<string, string> = {
  letter: "Letters",
  word: "Words",
  phrase: "Phrases",
  sentence: "Sentences",
  passage: "Passages",
  comprehension: "Comprehension answers",
};

const binaryScopeLabels = {
  overall: "Overall",
  content: "Content",
  letter: "Letters",
} as const;

const binaryScopeNotes = {
  overall:
    "Content uses normalized raw exact matching; letters use the current equivalence-aware resolver decision.",
  content: "Content is accepted only by normalized raw exact matching.",
  letter:
    "Letters use the current resolver decision, including active letter equivalences.",
} as const;

type BinaryScope = keyof typeof binaryScopeLabels;

function displayToken(token: string): string {
  return token === emptyToken ? "∅" : token;
}

function sortedTokens(tokens: Iterable<string>): string[] {
  return Array.from(new Set(tokens)).sort((left, right) => {
    if (left === emptyToken) return 1;
    if (right === emptyToken) return -1;
    return left.localeCompare(right);
  });
}

export function RawConfusionMatrixPage() {
  const staffUserId = useSystemAdminSpeechSession();
  const [fixtureSource, setFixtureSource] = useState("");
  const [taskType, setTaskType] = useState("");
  const [binaryScope, setBinaryScope] = useState<BinaryScope>("overall");
  const [matrixView, setMatrixView] = useState<"confusions" | "all">(
    "confusions",
  );
  const matrixQuery = useQuery({
    queryKey: ["raw-confusion-matrix", staffUserId, fixtureSource, taskType],
    queryFn: () =>
      getRawConfusionMatrix(staffUserId as number, {
        fixtureSource: fixtureSource || undefined,
        taskType: taskType || undefined,
      }),
    enabled: staffUserId !== null,
  });
  const matrix = matrixQuery.data;
  const labels = useMemo(() => {
    if (!matrix) return [];
    if (matrixView === "all") {
      return sortedTokens([
        ...matrix.labels.expected,
        ...matrix.labels.recognized,
      ]);
    }

    return sortedTokens(
      matrix.confusions.flatMap((cell) => [cell.expected, cell.recognized]),
    );
  }, [matrix, matrixView]);
  const cellCounts = useMemo(
    () =>
      new Map(
        (matrix?.cells ?? []).map((cell) => [
          `${cell.expected}\u0000${cell.recognized}`,
          cell.count,
        ]),
      ),
    [matrix],
  );
  const summary = matrix?.summary;
  const binary = matrix?.binary_classifications[binaryScope];
  const totalDifferences = summary
    ? summary.substitutions + summary.omissions + summary.insertions
    : 0;
  const fixtureSourceLabels = useMemo(
    () =>
      new Map(
        (matrix?.fixture_sources.sources ?? []).map((source) => [
          source.id,
          source.display_name,
        ]),
      ),
    [matrix],
  );

  return (
    <SpeechSandboxShell
      eyebrow="Speech analytics"
      title="Raw confusion matrix"
      description="Inspect the final bundled fixture benchmark against Mu's untouched output before Equivalence Book repair."
      sessionPurpose="the speech confusion matrix"
      badge={
        <span className="staff-environment-badge">Bundled audit baseline</span>
      }
    >
      <section
        className="confusion-summary"
        aria-label="Raw matrix summary"
        aria-busy={matrixQuery.isPending}
      >
        <Surface kind="panel" padding="normal">
          <span>Fixture runs</span>
          <strong>{summary?.attempts ?? "—"}</strong>
        </Surface>
        <Surface kind="panel" padding="normal">
          <span>Raw exact</span>
          <strong>{summary?.exact_attempts ?? "—"}</strong>
        </Surface>
        <Surface kind="panel" padding="normal">
          <span>Token accuracy</span>
          <strong>
            {summary
              ? `${(summary.raw_token_accuracy * 100).toFixed(2)}%`
              : "—"}
          </strong>
        </Surface>
        <Surface kind="panel" padding="normal">
          <span>Raw token differences</span>
          <strong>{summary ? totalDifferences : "—"}</strong>
        </Surface>
      </section>

      <Surface
        kind="panel"
        padding="normal"
        className="staff-data-card fixture-provenance"
      >
        <header className="staff-data-card__header">
          <div>
            <p>Bundled evaluation data</p>
            <h2>Fixture sources</h2>
          </div>
        </header>

        <p className="confusion-axis-note">
          {matrix?.fixture_sources.content_description ??
            "Loading fixture provenance."}
        </p>

        <div className="fixture-provenance__grid">
          {matrix?.fixture_sources.sources.map((source) => (
            <article key={source.id}>
              <div>
                <strong>{source.display_name}</strong>
              </div>
              <p>{source.description}</p>
            </article>
          ))}
          {matrix ? (
            <article>
              <div>
                <strong>{matrix.fixture_sources.negative.display_name}</strong>
                <span>FPTN and silence</span>
              </div>
              <p>{matrix.fixture_sources.negative.description}</p>
            </article>
          ) : null}
        </div>
      </Surface>

      <Surface
        kind="panel"
        padding="normal"
        className="staff-data-card binary-confusion"
      >
        <header className="staff-data-card__header">
          <div>
            <p>Raw acceptance decision</p>
            <h2>{binaryScopeLabels[binaryScope]} TP / TN / FP / FN</h2>
          </div>
          <label className="speech-sandbox-field">
            <span>Evaluation scope</span>
            <select
              aria-label="Binary evaluation scope"
              value={binaryScope}
              onChange={(event) =>
                setBinaryScope(event.target.value as BinaryScope)
              }
            >
              <option value="overall">Overall</option>
              <option value="content">Content only</option>
              <option value="letter">Letters only</option>
            </select>
          </label>
        </header>

        <p className="confusion-axis-note">
          Known-correct {binaryScopeLabels[binaryScope].toLowerCase()} fixture
          runs are positive. The bundled FPTN and silence fixtures are evaluated
          as negatives for content and letters. These fixed results ship with
          the app and do not depend on the live database.{" "}
          {binaryScopeNotes[binaryScope]}
        </p>

        <div className="binary-confusion__layout">
          <div className="binary-confusion__matrix">
            <span aria-hidden="true" />
            <strong>Mu accepted</strong>
            <strong>Mu rejected</strong>
            <strong>Known correct</strong>
            <div className="binary-confusion__cell binary-confusion__cell--good">
              <span>TP</span>
              <strong>{binary?.true_positives ?? "—"}</strong>
            </div>
            <div className="binary-confusion__cell binary-confusion__cell--bad">
              <span>FN</span>
              <strong>{binary?.false_negatives ?? "—"}</strong>
            </div>
            <strong>Known negative</strong>
            <div className="binary-confusion__cell binary-confusion__cell--bad">
              <span>FP</span>
              <strong>{binary?.false_positives ?? "—"}</strong>
            </div>
            <div className="binary-confusion__cell binary-confusion__cell--good">
              <span>TN</span>
              <strong>{binary?.true_negatives ?? "—"}</strong>
            </div>
          </div>

          <dl className="binary-confusion__metrics">
            <div>
              <dt>Accuracy</dt>
              <dd>{binary ? `${(binary.accuracy * 100).toFixed(2)}%` : "—"}</dd>
            </div>
            <div>
              <dt>Precision</dt>
              <dd>
                {binary ? `${(binary.precision * 100).toFixed(2)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt>Recall</dt>
              <dd>{binary ? `${(binary.recall * 100).toFixed(2)}%` : "—"}</dd>
            </div>
            <div>
              <dt>Specificity</dt>
              <dd>
                {binary ? `${(binary.specificity * 100).toFixed(2)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt>F1 score</dt>
              <dd>{binary ? `${(binary.f1_score * 100).toFixed(2)}%` : "—"}</dd>
            </div>
          </dl>
        </div>

        <div
          className="binary-confusion__sources"
          aria-label="Negative sources"
        >
          {Object.entries(binary?.negative_sources ?? {}).map(
            ([source, values]) => (
              <div key={source}>
                <strong>{source === "fptn" ? "FPTN speech" : source}</strong>
                <span>
                  {values.attempts} samples · {values.false_positives} FP ·{" "}
                  {values.true_negatives} TN
                </span>
              </div>
            ),
          )}
        </div>
      </Surface>

      <Surface
        kind="panel"
        padding="normal"
        className="staff-data-card confusion-workspace"
      >
        <header className="staff-data-card__header">
          <div>
            <p>Known-correct content and letter fixtures</p>
            <h2>Expected versus raw Mu token</h2>
          </div>
          <span>{labels.length} labels shown</span>
        </header>

        <div className="confusion-filters">
          <label className="speech-sandbox-field">
            <span>Voice fixture</span>
            <select
              value={fixtureSource}
              onChange={(event) => setFixtureSource(event.target.value)}
            >
              <option value="">All voices</option>
              {matrix?.available_filters.fixture_sources.map((value) => (
                <option key={value} value={value}>
                  {fixtureSourceLabels.get(value) ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="speech-sandbox-field">
            <span>Activity type</span>
            <select
              value={taskType}
              onChange={(event) => setTaskType(event.target.value)}
            >
              <option value="">All recording types</option>
              {matrix?.available_filters.task_types.map((value) => (
                <option key={value} value={value}>
                  {taskLabels[value] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="speech-sandbox-field">
            <span>Matrix view</span>
            <select
              value={matrixView}
              onChange={(event) =>
                setMatrixView(event.target.value as "confusions" | "all")
              }
            >
              <option value="confusions">Confused labels only</option>
              <option value="all">All observed tokens</option>
            </select>
          </label>
        </div>

        {matrixQuery.isError ? (
          <p className="speech-sandbox-error" role="alert">
            {matrixQuery.error.message}
          </p>
        ) : null}

        {matrixQuery.isPending ? (
          <div className="speech-sandbox-empty" aria-busy="true">
            <strong>Building the raw matrix</strong>
            <p>Reading recorded Mu fixture evidence.</p>
          </div>
        ) : labels.length ? (
          <>
            <p className="confusion-axis-note">
              Rows are expected tokens. Columns are raw Mu tokens. ∅ means no
              aligned token.
            </p>
            <div className="confusion-matrix-scroll" tabIndex={0}>
              <table className="confusion-matrix-table">
                <caption className="visually-hidden">
                  Raw Mu token confusion matrix
                </caption>
                <thead>
                  <tr>
                    <th className="confusion-matrix-table__corner" scope="col">
                      Expected ↓<br />
                      Raw Mu →
                    </th>
                    {labels.map((recognized) => (
                      <th
                        key={recognized}
                        scope="col"
                        title={displayToken(recognized)}
                      >
                        {displayToken(recognized)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((expected) => (
                    <tr key={expected}>
                      <th scope="row" title={displayToken(expected)}>
                        {displayToken(expected)}
                      </th>
                      {labels.map((recognized) => {
                        const count =
                          cellCounts.get(`${expected}\u0000${recognized}`) ?? 0;
                        const kind =
                          count === 0
                            ? "empty"
                            : expected === recognized
                              ? "match"
                              : "confusion";

                        return (
                          <td
                            className={`confusion-matrix-table__cell confusion-matrix-table__cell--${kind}`}
                            key={recognized}
                            title={`${displayToken(expected)} expected, ${displayToken(recognized)} recognized: ${count}`}
                          >
                            {count || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="speech-sandbox-empty">
            <strong>No raw confusions for this filter</strong>
            <p>Choose all observed tokens to inspect exact diagonal matches.</p>
          </div>
        )}
      </Surface>

      {matrix?.confusions.length ? (
        <Surface
          kind="panel"
          padding="normal"
          className="staff-data-card confusion-pairs"
        >
          <header className="staff-data-card__header">
            <div>
              <p>Raw error index</p>
              <h2>Observed confusion pairs</h2>
            </div>
            <span>{matrix.confusions.length} pairs</span>
          </header>
          <div className="confusion-pairs__table-scroll">
            <table>
              <caption className="visually-hidden">
                Raw Mu confusion pair counts
              </caption>
              <thead>
                <tr>
                  <th scope="col">Expected</th>
                  <th scope="col">Raw Mu</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {matrix.confusions.map((cell) => (
                  <tr key={`${cell.expected}-${cell.recognized}`}>
                    <td>{displayToken(cell.expected)}</td>
                    <td>{displayToken(cell.recognized)}</td>
                    <td>{cell.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}
    </SpeechSandboxShell>
  );
}
