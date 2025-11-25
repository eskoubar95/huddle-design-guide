# RHF + Zod Form (Server Actions)

Scaffold a consistent form with React Hook Form + Zod + server actions.

```md
Goal: Create form `{{FormName}}` with Zod validation and server action

Context:
- Follow `.cursor/rules/12-forms_actions_validation.mdc`
- UI strings centralizable/localizable; accessible inputs and errors

Inputs:
- Fields: {{fields_list}}
- Submit side-effects: {{submit_effects}}

Tasks:
1) Define Zod schema with precise error messages
2) RHF form component with controlled inputs and a submit button
3) Server action performing validated operation; return structured result
4) UX: pending state, error summary, field-level errors, success feedback
5) Telemetry: breadcrumbs for submit attempt/success/failure (no PII)
6) Tests: schema unit tests; action tests (happy/failure); component render

Deliverables:
- `components/forms/{{FormName}}Form.tsx`
- `lib/services/{{form_name}}/submit.ts` (server action)
- Zod schema `lib/domain/{{form_name}}/schema.ts`
```


