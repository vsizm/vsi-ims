# V1 Integrity Audit

## Acceptance boundaries

- Directorate → Programme → Project → Activity hierarchy.
- Finance budget scope at each hierarchy level.
- Management-action lifecycle and permissions.
- Indicator → Target → Result chain.
- Approval and separation-of-duties controls.

## V1 rule

Active programmes must have a Directorate assignment before they are accepted as production-ready. Non-closed projects must roll through a Directorate-assigned programme. Finance budgets must reference only the organisational level declared by their budget scope.

The validator is intentionally read-only. It reports integrity failures instead of inventing organisational mappings or mutating authoritative data.
