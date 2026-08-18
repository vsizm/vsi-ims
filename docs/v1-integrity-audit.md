# V1 Integrity Audit

## Audited boundaries

- Organisational hierarchy: Directorate → Programme → Project → Activity.
- Finance hierarchy: Directorate → Programme → Project → Activity budgets.
- Financial expenditure and budget audit trail.
- Management action lifecycle and permissions.
- Indicator → Target → Result chain.
- Audit-event coverage.

## Findings

### Fixed in this audit

1. **Management-action API used finance permissions.**
   - Read access was gated by `finance.dashboard.read`.
   - Create/update access was gated by `budgets.manage`.
   - This coupled management accountability to finance privileges and allowed the wrong roles to be treated as management-action operators.
   - Corrected to dedicated `management.actions.read` and `management.actions.manage` permissions.

### Acceptance attention

2. **Programme → Directorate assignment is nullable in the schema.**
   - This is intentional for draft configuration, but active programmes must have a Directorate before budgeting/executive reporting.
   - PR #25 provides a validation gate rather than inventing Directorate mappings.

3. **Finance `parentBudgetId` is application-validated but not declared as a database foreign key.**
   - Existing API checks parent existence, level, year, organisational alignment and allocation capacity.
   - A future migration can add a self-referencing FK after confirming the production data is clean.

4. **Several numeric/date business rules remain primarily API-level.**
   - Budget amounts are positive at API validation.
   - Target/result periods and other cross-record rules should remain explicit in acceptance tests until a migration is planned.

## V1 decision

Do not invent missing organisational data to make the demo look complete. The authoritative Directorate/programme mapping must be supplied before production seed acceptance.
