# Sentry Instrumentation

Instrument a feature with Sentry (errors, performance, breadcrumbs) safely.

```md
Goal: Add Sentry instrumentation to `{{feature}}`

Context:
- Follow `.cursor/rules/24-observability_sentry.mdc`
- No PII in logs or error contexts

Tasks:
1) Initialize Sentry (if not already) with release + env tags
2) Wrap critical async paths with spans/transactions
3) Capture exceptions with minimal, useful context (no PII)
4) Add breadcrumbs for key user actions and flag evaluations
5) Ensure sampling is reasonable; avoid noise

Deliverables:
- Lightweight helpers for spans and error capture
- Calls in hot paths (server actions, API handlers, key UI flows)
- Quick test plan or manual steps to verify events
```


