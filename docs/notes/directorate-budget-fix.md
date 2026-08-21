# Directorate budget reference fix

The Directorate budget form now sends both the UUID and the Directorate business code. The API resolves the Directorate by its unique code when a browser submits a stale UUID after a deployment or data refresh, while still validating the resolved UUID against the current database record.

This keeps the database UUID model authoritative and makes the budget allocation flow resilient to stale client state.
