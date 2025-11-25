# Feature Flags (LaunchDarkly)

Create or gate a feature behind a LaunchDarkly flag following governance.

```md
Goal: Apply feature flag `{{flag_key}}` to {{scope}}

Context:
- Follow `.cursor/rules/25-feature_flags.mdc`
- Naming: product_area.feature.intent (kebab-case). Example: `checkout.shipping.new-pickup-flow`
- Include kill switch + default safe behavior

Inputs:
- flag_key: {{flag_key}}
- rollout: {{rollout_strategy}} (e.g., env, % rollout, user segment)
- fallback UX: {{fallback_description}}

Tasks:
1) Add flag read in a single utility wrapper (DI-friendly) `lib/flags/getFlag.ts`
2) Guard UI/logic paths; keep default safe path
3) Add analytics breadcrumb on flag evaluation (no PII)
4) Document flag purpose, owner, rollout plan, and removal criteria
5) Tests: flag on/off behavior and safe defaults

Deliverables:
- Minimal wrapper for flag reading
- Guarded code paths with clear default
- Short docs snippet (README/ADR) and tests
```


