---
domain: saas-engineering
task_class: deployment-configuration
format: experience-narrative-b
source: real agent operational memory (sanitized, redacted)
type: feedback
---

# Verify service state from environment config, not assumptions

## When This Applies

When an agent is working on a product that has optional external service integrations (OCR, payment processing, email providers, etc.) that are conditionally enabled via environment variables or feature flags.

## What I Learned

The agent repeatedly told the operator that the OCR service was "mocked" or "not connected" in production. This was wrong. The application logic switches between a mock client (for tests) and the real cloud vision API client based on environment configuration — when the credential env var is set in production, the real service runs.

The confusion arose because:
1. Tests always use the mock client, so reading test code gives the wrong impression
2. The credential is optional in the config schema, so it looks like it might not be set
3. Early in development, OCR genuinely wasn't connected — but the agent kept repeating this after it was fixed

**Why:** The operator corrected this multiple times. The agent was making claims about production state based on reading code structure rather than checking actual deployment configuration.

**How to apply:** Before claiming an external service is "not connected" or "mocked":
1. Check the actual deployment environment for the relevant credential/config variable
2. Trace the conditional logic that selects real vs. mock implementations
3. Don't assume current state from historical context — services get connected over time
4. If you can't check the deployment environment directly, say "I can't verify whether [service] is active — check the [ENV_VAR] setting" rather than asserting it's mocked

## Confidence Notes

- HIGH confidence. This was a repeated correction — the operator had to correct the agent at least three times. The underlying principle (verify deployment state, don't assume from code structure) is broadly applicable to any project with conditional service integrations.
