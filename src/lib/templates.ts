export interface UserStoryInput {
  title: string;
  persona: string;
  need: string;
  benefit: string;
  acceptanceCriteria: { given: string; when: string; then: string }[];
  source: string;
  status: "needs triage" | "ready for grooming" | "approved";
}

export function renderUserStory(input: UserStoryInput): string {
  const ac = input.acceptanceCriteria
    .map((c) => `  Given ${c.given}, When ${c.when}, Then ${c.then}`)
    .join("\n");
  return `Title: ${input.title}
As a ${input.persona}, I want ${input.need}, so that ${input.benefit}.
Acceptance Criteria (Gherkin):
${ac}
Source: ${input.source}
Status: ${input.status}`;
}

export interface PrdInput {
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  successMetrics: string[];
  scopeIn: string[];
  scopeOut: string[];
  risksAndOpenQuestions: string[];
  rolloutPlan: string;
}

export function renderPrd(input: PrdInput): string {
  const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
  return `1. Problem statement
${input.problemStatement}

2. Goals / Non-goals
Goals:
${list(input.goals)}
Non-goals:
${list(input.nonGoals)}

3. Success metrics
${list(input.successMetrics)}

4. Scope (in / out)
In scope:
${list(input.scopeIn)}
Out of scope:
${list(input.scopeOut)}

5. Key risks and open questions
${list(input.risksAndOpenQuestions)}

6. Rollout plan
${input.rolloutPlan}`;
}

export interface BrdInput {
  businessObjective: string;
  background: string;
  stakeholders: string[];
  businessRequirements: string[];
  assumptionsAndConstraints: string[];
  successCriteria: string[];
  outOfScope: string[];
}

export function renderBrd(input: BrdInput): string {
  const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
  const numbered = (items: string[]) => items.map((i, idx) => `${idx + 1}. ${i}`).join("\n");
  return `1. Business objective
${input.businessObjective}

2. Background / context
${input.background}

3. Stakeholders
${list(input.stakeholders)}

4. Business requirements
${numbered(input.businessRequirements)}

5. Assumptions & constraints
${list(input.assumptionsAndConstraints)}

6. Success criteria
${list(input.successCriteria)}

7. Out of scope
${list(input.outOfScope)}`;
}

export interface HealthCheckReport {
  epicOrSprint: string;
  missingAcceptanceCriteria: { key: string; summary: string }[];
  unestimated: { key: string; summary: string }[];
  stale: { key: string; summary: string; daysSinceUpdate: number }[];
  scopeDrift: string[];
  qaCoverageGaps: string[];
  verdict: "on track" | "at risk" | "blocked";
  verdictReason: string;
}

export function renderHealthCheck(r: HealthCheckReport): string {
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- none found");
  const issueList = (items: { key: string; summary: string }[]) =>
    items.length ? items.map((i) => `- ${i.key}: ${i.summary}`).join("\n") : "- none found";
  const staleList = (items: HealthCheckReport["stale"]) =>
    items.length
      ? items.map((i) => `- ${i.key}: ${i.summary} (${i.daysSinceUpdate}d since update)`).join("\n")
      : "- none found";

  return `Health Check: ${r.epicOrSprint}

Stories missing acceptance criteria:
${issueList(r.missingAcceptanceCriteria)}

Unestimated stories:
${issueList(r.unestimated)}

Stale tickets:
${staleList(r.stale)}

Scope drift vs. original epic description:
${list(r.scopeDrift)}

QA coverage gaps:
${list(r.qaCoverageGaps)}

Verdict: ${r.verdict} — ${r.verdictReason}`;
}
