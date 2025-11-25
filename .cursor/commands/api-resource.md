# API Resource (Design + Impl)

Design and implement a versioned API resource per our standards.

```md
Goal: Implement API resource `{{ResourceName}}` (v1)

Context:
- Follow `.cursor/rules/21-api_design.mdc` (resource model, errors, pagination)
- Security: `.cursor/rules/22-security_secrets.mdc`
- Observability: `.cursor/rules/24-observability_sentry.mdc`

Inputs:
- Entities and relations: {{entities_overview}}
- Operations: {{operations_list}} (e.g., list/get/create/update/delete)

Tasks:
1) Model DTOs and validation schemas
2) Define routes: `/api/v1/{{resource}}` with appropriate methods
3) Implement handlers with consistent error responses `{ code, message, details }`
4) Add pagination (cursor-based when list endpoints)
5) Authorization checks, input validation, and sanitization
6) Structured logging + Sentry capture for unexpected errors
7) Tests: unit for validation/logic, integration for endpoints

Deliverables:
- Route handlers with clear typing
- Validation (Zod) and domain types
- Tests covering happy/failure/edge cases
- Minimal README snippet documenting endpoints and examples
```


