import * as XLSX from "xlsx";

export interface RegressionSummary {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  notExecuted: number;
  executionPct: number;
  byFeature: { feature: string; pass: number; fail: number; blocked: number; notExecuted: number }[];
  failingOrBlocked: { feature: string; scenario: string; assignee: string; result: string; remark: string }[];
}

export interface TestCaseTrackerSummary {
  total: number;
  done: number;
  byAssignee: { assignee: string; total: number; done: number }[];
}

export interface AutomationSummary {
  total: number;
  done: number;
  inProgress: number;
  notStarted: number;
}

export interface QaSnapshot {
  uploadedAt: string;
  sourceFileName: string;
  regression: RegressionSummary | null;
  testcaseTracker: TestCaseTrackerSummary | null;
  automation: AutomationSummary | null;
}

/** The same person shows up under different spellings across sheets (and even
 * different handles on GitHub/Jira) — a real-world data-cleaning problem, not a
 * hypothetical one. This is a best-effort alias map for the variants actually
 * observed in this sheet; extend it if new variants show up. */
const NAME_ALIASES: Record<string, string> = {
  "sai krishna": "Saikrishna",
  saikrishna: "Saikrishna",
  "sai lahari": "Lahari",
  lahari: "Lahari",
};

function normalizeName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const key = cleaned.toLowerCase();
  return NAME_ALIASES[key] ?? cleaned;
}

function sheetRows(wb: XLSX.WorkBook, name: string): string[][] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as string[][];
}

function cell(row: string[] | undefined, i: number): string {
  return (row?.[i] ?? "").toString().trim();
}

const REGRESSION_RESULTS = new Set(["pass", "fail", "blocked", "not executed"]);

function parseRegression(wb: XLSX.WorkBook): RegressionSummary | null {
  const rows = sheetRows(wb, "Regression ") ?? sheetRows(wb, "Regression");
  if (rows.length === 0) return null;

  const byFeature = new Map<string, { pass: number; fail: number; blocked: number; notExecuted: number }>();
  const failingOrBlocked: RegressionSummary["failingOrBlocked"] = [];
  let pass = 0,
    fail = 0,
    blocked = 0,
    notExecuted = 0;

  for (let i = 1; i < rows.length; i++) {
    const feature = cell(rows[i], 0);
    const scenario = cell(rows[i], 1);
    const assignee = normalizeName(cell(rows[i], 2));
    const result = cell(rows[i], 3);
    const remark = cell(rows[i], 4);
    const key = result.toLowerCase();
    if (!REGRESSION_RESULTS.has(key)) continue; // blank padding rows, not real test rows

    const entry = byFeature.get(feature) ?? { pass: 0, fail: 0, blocked: 0, notExecuted: 0 };
    if (key === "pass") {
      pass++;
      entry.pass++;
    } else if (key === "fail") {
      fail++;
      entry.fail++;
      failingOrBlocked.push({ feature, scenario, assignee, result, remark });
    } else if (key === "blocked") {
      blocked++;
      entry.blocked++;
      failingOrBlocked.push({ feature, scenario, assignee, result, remark });
    } else {
      notExecuted++;
      entry.notExecuted++;
    }
    byFeature.set(feature, entry);
  }

  const total = pass + fail + blocked + notExecuted;
  if (total === 0) return null;

  return {
    total,
    pass,
    fail,
    blocked,
    notExecuted,
    executionPct: Math.round(((total - notExecuted) / total) * 1000) / 10,
    byFeature: [...byFeature.entries()].map(([feature, v]) => ({ feature, ...v })),
    failingOrBlocked,
  };
}

/** Testcase_Tracker has a real table, then — once a release is added — a second
 * stacked table starting with the same header row repeated further down (seen here
 * as an empty "MVP 2 Test cases Tracker" block). Detect a repeated header instead of
 * assuming there's only one table, and merge both into one total. */
function parseTestcaseTracker(wb: XLSX.WorkBook): TestCaseTrackerSummary | null {
  const rows = sheetRows(wb, "Testcase_Tracker");
  if (rows.length === 0) return null;

  const byAssignee = new Map<string, { total: number; done: number }>();
  let total = 0,
    done = 0;

  for (let i = 1; i < rows.length; i++) {
    const userStory = cell(rows[i], 0);
    const assigneeRaw = cell(rows[i], 1);
    const testCaseId = cell(rows[i], 2);
    const status = cell(rows[i], 3);
    if (!userStory || !assigneeRaw || status.toLowerCase() === "testcase status") continue; // header/blank rows
    if (!testCaseId) continue;

    total++;
    const isDone = status.toLowerCase() === "done";
    if (isDone) done++;

    // A handful of rows credit a test case to more than one tester in a single
    // comma-separated cell (e.g. "Sai Krishna ,Nikitha") — split so both get credit
    // instead of the pair being tallied as one distinct "assignee".
    const assignees = assigneeRaw
      .split(",")
      .map((a) => normalizeName(a))
      .filter(Boolean);
    for (const assignee of assignees) {
      const entry = byAssignee.get(assignee) ?? { total: 0, done: 0 };
      entry.total++;
      if (isDone) entry.done++;
      byAssignee.set(assignee, entry);
    }
  }

  if (total === 0) return null;
  return {
    total,
    done,
    byAssignee: [...byAssignee.entries()].map(([assignee, v]) => ({ assignee, ...v })),
  };
}

function parseAutomation(wb: XLSX.WorkBook): AutomationSummary | null {
  const rows = sheetRows(wb, "Automation_Scenarios");
  if (rows.length === 0) return null;

  let done = 0,
    inProgress = 0,
    notStarted = 0;
  for (let i = 1; i < rows.length; i++) {
    const id = cell(rows[i], 0);
    const scenario = cell(rows[i], 2);
    if (!id && !scenario) continue; // fully blank row
    const status = cell(rows[i], 4).toLowerCase().replace(/\s+/g, " ");
    if (status === "done") done++;
    else if (status === "in progress" || status === "inprogress") inProgress++;
    else notStarted++;
  }

  const total = done + inProgress + notStarted;
  if (total === 0) return null;
  return { total, done, inProgress, notStarted };
}

export function parseQaWorkbook(buffer: Buffer, sourceFileName: string): QaSnapshot {
  const wb = XLSX.read(buffer, { type: "buffer" });
  return {
    uploadedAt: new Date().toISOString(),
    sourceFileName,
    regression: parseRegression(wb),
    testcaseTracker: parseTestcaseTracker(wb),
    automation: parseAutomation(wb),
  };
}
