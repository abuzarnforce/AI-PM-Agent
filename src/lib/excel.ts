import * as XLSX from "xlsx";

export interface TestCaseRow {
  id: string;
  steps: string;
  expected: string;
  actual: string;
  status: string;
  linkedTicket: string | null;
}

const HEADER_ALIASES: Record<keyof TestCaseRow, string[]> = {
  id: ["id", "test case id", "tc id", "test id"],
  steps: ["steps", "test steps", "step"],
  expected: ["expected", "expected result"],
  actual: ["actual", "actual result"],
  status: ["status", "result"],
  linkedTicket: ["linked ticket", "ticket", "jira", "jira id", "linked issue"],
};

function findHeaderKey(headers: string[], aliases: string[]): string | undefined {
  return headers.find((h) => aliases.includes(h.trim().toLowerCase()));
}

/** Parses the first sheet of an uploaded QA spreadsheet into normalized rows.
 * Column names are matched fuzzily (see HEADER_ALIASES) since PMs' sheets vary. */
export function parseTestCases(buffer: Buffer): TestCaseRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const keyMap: Partial<Record<keyof TestCaseRow, string>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as (keyof TestCaseRow)[]) {
    const match = findHeaderKey(headers, HEADER_ALIASES[field]);
    if (match) keyMap[field] = match;
  }

  return rows.map((row, i) => ({
    id: String(keyMap.id ? row[keyMap.id] : `ROW-${i + 1}`),
    steps: String(keyMap.steps ? row[keyMap.steps] : ""),
    expected: String(keyMap.expected ? row[keyMap.expected] : ""),
    actual: String(keyMap.actual ? row[keyMap.actual] : ""),
    status: String(keyMap.status ? row[keyMap.status] : "").toLowerCase(),
    linkedTicket: keyMap.linkedTicket ? String(row[keyMap.linkedTicket] || "") || null : null,
  }));
}
