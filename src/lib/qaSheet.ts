import * as XLSX from "xlsx";

export interface RegressionSummary {
  release: string;
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  inProgress: number;
  notExecuted: number;
  executionPct: number;
  testers: string[];
  byFeature: { feature: string; pass: number; fail: number; blocked: number; notExecuted: number }[];
  failingOrBlocked: { feature: string; scenario: string; assignee: string; result: string; remark: string }[];
}

export interface TestCaseTrackerSummary {
  total: number;
  done: number;
  byAssignee: { assignee: string; total: number; done: number }[];
  /** Testcase_Tracker stacks one table per release (e.g. "MVP 1 Test cases Tracker",
   * "MVP 2 Test cases Tracker") — split out here so the QA dashboard can show MVP 2.0
   * status on its own instead of folded into the overall total. Rows before the first
   * release header are attributed to "MVP 1". */
  releases: { release: string; total: number; done: number; byAssignee: { assignee: string; total: number; done: number }[] }[];
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
  /** Kept for the health check route: the release with the most rows, i.e. the
   * "headline" regression status. Prefer regressionByRelease for a QA dashboard. */
  regression: RegressionSummary | null;
  /** The team tracks regression in one sheet per release ("Regression MVP 1.0",
   * "Regression MVP 2.0", ...) instead of one combined sheet — this is that, one
   * entry per sheet found, most recent release first. */
  regressionByRelease: RegressionSummary[];
  testcaseTracker: TestCaseTrackerSummary | null;
  automation: AutomationSummary | null;
}

/** The same person shows up under different spellings across sheets (and even
 * different handles on GitHub/Jira) — a real-world data-cleaning problem, not a
 * hypothetical one. This is a best-effort alias map for the variants actually
 * observed in this sheet; extend it if new variants show up. */
const NAME_ALIASES: Record<string, string> = {
  "sai krishna": "Saikrishna",
  "sai kishna": "Saikrishna",
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

const REGRESSION_RESULTS = new Set(["pass", "fail", "blocked", "in progress", "not executed"]);

/** Extracts a release label from a sheet name like "Regression MVP 2.0  " → "MVP 2.0".
 * Falls back to the sheet name itself (trimmed) for a plain "Regression" sheet with
 * no release in its name, so older single-sheet workbooks still parse. */
function releaseLabel(sheetName: string): string {
  const match = sheetName.match(/mvp\s*[\d.]+/i);
  if (match) return match[0].replace(/\s+/g, " ").trim().replace(/^mvp/i, "MVP");
  return sheetName.replace(/regression/i, "").trim() || sheetName.trim();
}

function parseOneRegressionSheet(rows: string[][], release: string): RegressionSummary | null {
  const byFeature = new Map<string, { pass: number; fail: number; blocked: number; notExecuted: number }>();
  const failingOrBlocked: RegressionSummary["failingOrBlocked"] = [];
  const testers = new Set<string>();
  let pass = 0,
    fail = 0,
    blocked = 0,
    inProgress = 0,
    notExecuted = 0;

  for (let i = 1; i < rows.length; i++) {
    const feature = cell(rows[i], 0);
    const scenario = cell(rows[i], 1);
    const assignee = normalizeName(cell(rows[i], 2));
    const result = cell(rows[i], 3);
    const remark = cell(rows[i], 4);
    const key = result.toLowerCase();
    if (!REGRESSION_RESULTS.has(key)) continue; // blank padding rows, not real test rows
    if (assignee) testers.add(assignee);

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
    } else if (key === "in progress") {
      inProgress++;
    } else {
      notExecuted++;
      entry.notExecuted++;
    }
    byFeature.set(feature, entry);
  }

  const total = pass + fail + blocked + inProgress + notExecuted;
  if (total === 0) return null;

  return {
    release,
    total,
    pass,
    fail,
    blocked,
    inProgress,
    notExecuted,
    executionPct: Math.round(((total - notExecuted - inProgress) / total) * 1000) / 10,
    testers: [...testers].sort(),
    byFeature: [...byFeature.entries()].map(([feature, v]) => ({ feature, ...v })),
    failingOrBlocked,
  };
}

/** The team tracks regression in one sheet per release ("Regression MVP 1.0",
 * "Regression MVP 2.0", ...) rather than a single combined sheet. Parse every sheet
 * whose name contains "regression", most recent release first. */
function parseRegressionByRelease(wb: XLSX.WorkBook): RegressionSummary[] {
  const sheetNames = wb.SheetNames.filter((n) => /regression/i.test(n));
  const summaries = sheetNames
    .map((name) => parseOneRegressionSheet(sheetRows(wb, name), releaseLabel(name)))
    .filter((s): s is RegressionSummary => s != null);
  return summaries.sort((a, b) => b.release.localeCompare(a.release, undefined, { numeric: true }));
}

/** Testcase_Tracker has a real table, then — once a release is added — a second
 * stacked table starting with the same header row repeated further down (seen here
 * as an empty "MVP 2 Test cases Tracker" block). Detect a repeated header instead of
 * assuming there's only one table, and merge both into one total. */
function parseTestcaseTracker(wb: XLSX.WorkBook): TestCaseTrackerSummary | null {
  const rows = sheetRows(wb, "Testcase_Tracker");
  if (rows.length === 0) return null;

  const byAssignee = new Map<string, { total: number; done: number }>();
  const releases = new Map<string, { total: number; done: number; byAssignee: Map<string, { total: number; done: number }> }>();
  let currentRelease = "MVP 1";
  let total = 0,
    done = 0;

  const emptyRelease = () => ({ total: 0, done: 0, byAssignee: new Map<string, { total: number; done: number }>() });

  for (let i = 1; i < rows.length; i++) {
    const userStory = cell(rows[i], 0);
    const assigneeRaw = cell(rows[i], 1);
    const testCaseId = cell(rows[i], 2);
    const status = cell(rows[i], 3);

    // A stacked section header like "MVP 2 Test cases Tracker" — only the first
    // column is filled, the rest are blank. Switch release context and register it
    // (even with zero rows so far) so an empty upcoming release still shows as "not started".
    const releaseMatch = !assigneeRaw && userStory.match(/mvp\s*(\d+(?:\.\d+)?)/i);
    if (releaseMatch) {
      currentRelease = `MVP ${releaseMatch[1]}`;
      if (!releases.has(currentRelease)) releases.set(currentRelease, emptyRelease());
      continue;
    }

    if (!userStory || !assigneeRaw || status.toLowerCase() === "testcase status") continue; // header/blank rows
    if (!testCaseId) continue;

    total++;
    const isDone = status.toLowerCase() === "done";
    if (isDone) done++;

    const release = releases.get(currentRelease) ?? emptyRelease();
    release.total++;
    if (isDone) release.done++;

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

      const relEntry = release.byAssignee.get(assignee) ?? { total: 0, done: 0 };
      relEntry.total++;
      if (isDone) relEntry.done++;
      release.byAssignee.set(assignee, relEntry);
    }
    releases.set(currentRelease, release);
  }

  if (total === 0) return null;
  return {
    total,
    done,
    byAssignee: [...byAssignee.entries()].map(([assignee, v]) => ({ assignee, ...v })),
    releases: [...releases.entries()].map(([release, v]) => ({
      release,
      total: v.total,
      done: v.done,
      byAssignee: [...v.byAssignee.entries()].map(([assignee, vv]) => ({ assignee, ...vv })),
    })),
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
  const regressionByRelease = parseRegressionByRelease(wb);
  const headline = [...regressionByRelease].sort((a, b) => b.total - a.total)[0] ?? null;
  return {
    uploadedAt: new Date().toISOString(),
    sourceFileName,
    regression: headline,
    regressionByRelease,
    testcaseTracker: parseTestcaseTracker(wb),
    automation: parseAutomation(wb),
  };
}
