# Postgres Migration + RLS

Create a safe migration with Row Level Security following our database rules.

```md
Goal: Add table(s) and RLS for `{{resource}}`

Context:
- Follow `.cursor/rules/30-database_postgres.mdc`
- Deterministic migrations, reversible when possible

Tasks:
1) Create migration file `migrations/YYYYMMDDHHMM__{{slug}}.sql`
2) Define schema changes (tables, indexes, constraints) with comments
3) Enable RLS on new tables and add policies for least privilege
4) Seed minimal test data (non-PII) if needed
5) Add rollback section or companion down migration when feasible
6) Document performance considerations (indexes) and expected query paths

Deliverables:
- SQL migration with RLS policies
- Short README note with how to apply + verify
- Basic query examples to validate policies
```


