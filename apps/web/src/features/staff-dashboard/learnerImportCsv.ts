import type { LearnerImportRow } from "../staff-auth/staffApi";

const REQUIRED_HEADERS = [
  "first_name",
  "middle_name",
  "last_name",
  "suffix",
  "lrn",
] as const;

function readCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unfinished quoted value.");
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((candidate) =>
    candidate.some((value) => value.trim() !== ""),
  );
}

export function parseLearnerImportCsv(source: string): LearnerImportRow[] {
  const rows = readCsvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    throw new Error("Add the header row and at least one Learner row.");
  }

  const headers = rows[0].map((value) => value.trim().toLowerCase());
  if (
    headers.length !== REQUIRED_HEADERS.length ||
    REQUIRED_HEADERS.some((header, index) => headers[index] !== header)
  ) {
    throw new Error(
      `Use these columns in order: ${REQUIRED_HEADERS.join(", ")}.`,
    );
  }

  const learnerRows = rows.slice(1);
  if (learnerRows.length > 100) {
    throw new Error("Import no more than 100 Learners at a time.");
  }

  return learnerRows.map((values, rowIndex) => {
    if (values.length !== REQUIRED_HEADERS.length) {
      throw new Error(`Row ${rowIndex + 2} must contain exactly five columns.`);
    }

    const [firstName, middleName, lastName, suffix, lrn] = values.map((value) =>
      value.trim(),
    );
    if (!firstName || !middleName || !lastName) {
      throw new Error(
        `Row ${rowIndex + 2} requires first, middle, and last names.`,
      );
    }

    return {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      suffix,
      lrn,
    };
  });
}
