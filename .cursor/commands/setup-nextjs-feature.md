# Next.js Feature Scaffold

Create a production-grade Next.js 15 (App Router) feature with React 19.

```md
Goal: Scaffold feature "{{feature_name}}"

Context:
- Next.js 15 + React 19 (App Router)
- Follow repo rules in `.cursor/rules`:
  - 00-foundations, 10-nextjs_frontend, 12-forms_actions_validation,
    21-api_design, 22-security_secrets, 24-observability_sentry, 25-feature_flags
- Principles: SRP, small files, explicit types, tests for critical paths

Inputs:
- route: /{{route}}
- domain model brief: {{model_brief}}
- gated by flag? {{flag_name | none}}

Deliverables:
1) UI route at `app/{{route}}/page.tsx` and necessary child components under `components/{{Feature}}/`
2) Server actions in `lib/services/{{feature}}/` (pure logic in lib, side-effects isolated)
3) Domain types in `lib/domain/{{feature}}/` (DTOs, IO types, schemas)
4) API integration (if needed) following `21-api_design` (errors, pagination, versioning)
5) Feature flag guard using `25-feature_flags` (kill switch + default safe state)
6) Sentry instrumentation per `24-observability_sentry` (no PII; add breadcrumbs)
7) Tests: unit for services, integration for actions, basic render tests for components

Checklist:
- Accessibility: semantic elements, labels, keyboard nav
- Error handling: clear user messages; never leak PII
- Performance: lazy-load heavy parts; avoid unnecessary re-renders
- i18n-ready strings (no scattered hard-coded copy)
```


