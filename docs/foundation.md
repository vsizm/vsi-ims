# VSI IMS foundation

## What is authoritative

- `programmes` owns programme identity and objectives.
- `projects` references a programme; it does not copy programme attributes.
- `activities` and `reports` reference a project; they do not copy project attributes.
- `audit_events` records material activity by entity ID.

Future finance, MEAL, beneficiaries, volunteers, risks and documents must each use their own authoritative tables and link to these core records by ID.

## Environment rules

| Environment | Database | Data |
|---|---|---|
| Development | Neon development branch | synthetic/anonymised only |
| Staging/Acceptance | Neon staging branch | approved acceptance-test data |
| Production | Neon production branch | live VSI data |

Never run `db:migrate` against Production until the migration has passed acceptance testing. Each API route is server-only and requires the temporary service guard. Replace it with VSI end-user authentication and an audit actor before opening the interface to users.
