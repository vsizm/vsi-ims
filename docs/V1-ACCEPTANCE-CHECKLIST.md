# VSI IMS V1 Acceptance Checklist

This checklist is the staging/acceptance gate for V1. It is intentionally business-flow focused rather than a cosmetic QA list.

## 1. Access and governance

- [ ] Login succeeds with configured V1 administrator account.
- [ ] Unauthenticated access to protected APIs returns `401`.
- [ ] Unauthenticated dashboard access redirects to `/login`.
- [ ] Role permissions prevent users from performing actions outside their role.
- [ ] Management/finance actions are attributable to a user and timestamp.

## 2. Organisational hierarchy

- [ ] Directorate exists as the organisational parent.
- [ ] Programme belongs to the correct Directorate.
- [ ] Project belongs to the correct Programme.
- [ ] Activity belongs to the correct Project.
- [ ] Invalid parent relationships are rejected rather than inferred.

## 3. Budget control

- [ ] Directorate budget can be established for a financial year.
- [ ] Programme allocation cannot exceed its Directorate available budget.
- [ ] Project allocation cannot exceed its Programme available budget.
- [ ] Activity allocation cannot exceed its Project available budget.
- [ ] Financial-year mismatches are rejected.
- [ ] Budget totals are not duplicated as independent roll-up records.

## 4. Financial intelligence

- [ ] Directorate financial position shows budget, commitments, paid expenditure and remaining balance.
- [ ] Programme/Project/Activity positions reconcile to authoritative financial records.
- [ ] Financial intelligence is scoped to the selected year.
- [ ] Utilisation/attention signals are derived from the financial source of truth.

## 5. Delivery and results

- [ ] Indicator is linked to the correct Project/Activity.
- [ ] Target is linked to the correct indicator and year.
- [ ] Result is linked to the correct target and reporting period.
- [ ] Delivery achievement is calculated from target/result records.
- [ ] Projects without targets are clearly identified rather than treated as zero achievement.

## 6. Finance × delivery intelligence

- [ ] High financial utilisation with weak delivery is surfaced as management attention.
- [ ] Low financial utilisation with strong delivery is surfaced for verification where appropriate.
- [ ] Finance and delivery signals remain traceable to their authoritative records.
- [ ] No second financial calculation engine is introduced in the management layer.

## 7. Management accountability

- [ ] A finding can be recorded from an identified exception.
- [ ] Recommendation is captured.
- [ ] Decision/management response is captured where required.
- [ ] Action has an owner and due date where required.
- [ ] Open and in-progress actions are visible to management.
- [ ] Overdue actions are identified.
- [ ] Overdue escalation increases severity only to the defined ceiling.
- [ ] Completed/cancelled actions are excluded from overdue escalation.
- [ ] Escalation is auditable and repeat-safe.

## 8. Executive management view

- [ ] Executive view shows open findings.
- [ ] Executive view shows actions in progress.
- [ ] Executive view shows overdue actions.
- [ ] Executive view shows critical unresolved matters.
- [ ] Directorate financial position is visible.
- [ ] Financial evidence and management actions remain linked conceptually without duplicating source data.

## 9. Demonstration scenarios

Use realistic staging data and confirm these scenarios manually:

### Healthy

- 60% financial utilisation.
- 65% delivery achievement.
- No critical finding required.

### High spend / low delivery

- 85%+ financial utilisation.
- <50% delivery achievement.
- Exception appears in management attention.
- Finding/action can be tracked.

### Low spend / high delivery

- Low financial utilisation.
- High delivery achievement.
- Signal is available for verification rather than automatically treated as failure.

### Overdue action

- Open action passes its due date.
- Escalation raises severity once.
- Re-running escalation does not repeatedly increase severity.
- Completed/cancelled actions do not escalate.

## 10. V1 release gate

V1 is ready for acceptance only when:

1. The complete management chain works end-to-end.
2. No known data-integrity defect remains in the hierarchy or budget controls.
3. Required CI/deployment checks are green.
4. Staging data supports a credible executive demonstration.
5. Production release remains blocked until staging acceptance is explicitly confirmed.
