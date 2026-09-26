# Gated AI development workflow

Follow the user's feature brief and acceptance criteria. Use existing
repository patterns. Do not expand scope or add dependencies without
explicit approval.

## Human approval gates

An initial request to build a feature authorizes planning only.
Advance through the stages below only after explicit human approval.
Carry forward approvals already given; do not request them twice.
Never treat an AI review or passing tests as human approval.

### 1. Plan (no code)
Inspect relevant source files and existing tests. Produce a plan covering:
- Acceptance criteria and the files to change.
- Data types, validation, authentication and ownership checks.
- Firestore rules, queries and indexes.
- Tests to write first and how to verify the deployed preview.
- Any assumptions or decisions needing human input.

Do not edit files. Stop for human approval of the plan.

### 2. Tests first
After plan approval, write tests for the agreed behavior using the
existing test framework. Cover validation boundaries, authentication,
ownership rejection and successful operations where applicable.

Run the tests. Explain expected failures separately from test setup
errors. Do not implement production behavior yet.
Stop for human review of the tests and approval to implement.

### 3. Implement and verify
After test approval, implement only the agreed plan.
Enforce authorization in server code as well as Firestore rules:
the Admin SDK bypasses those rules. Derive ownership from the verified
session, never from client-supplied identity fields.

Run:
- pnpm run typecheck
- pnpm run lint
- pnpm run test:all

Do not weaken tests, skip failures or lower thresholds to obtain a pass.
If the approved contract needs a material change, explain it and stop
for a human decision. Otherwise, present the diff, check results and
remaining issues for human review.

### 4. Review and correct
When asked to review, report findings without editing files.
Check acceptance criteria, security, regressions and scope.
Apply fixes only after the human accepts the findings.
Rerun affected checks and report unresolved issues.

### 5. Preview and acceptance
Before deployment, identify the exact revision, target environment,
rules/index changes and verification steps. Obtain explicit deployment
approval unless already provided for that target and scope.

Verify lodge, live list and resolve on the actual preview, including
ownership restrictions. Local tests alone do not prove preview success.
Report observed results and anything requiring human verification.
The human decides final acceptance.

## Working discipline

- Use pnpm and existing repository conventions.
- Preserve unrelated changes and keep secrets out of code and output.
- Do not commit, push, merge or deploy without user authorization.
- Report actual commands and results; never invent evidence.
- Record only the experiment measurements requested by the user.
  Do not invent timings, token counts or additional metric requirements.