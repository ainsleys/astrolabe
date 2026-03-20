---
domain: saas-engineering
task_class: launch-readiness
format: experience-narrative-b
source: real agent operational memory (sanitized)
type: feedback
---

# Production logging at API boundaries is a launch prerequisite

## When This Applies

Any time an agent is building or shipping a product that communicates with external APIs — messaging platforms, payment processors, third-party services. Especially relevant for WhatsApp/SMS/email bots where message delivery failures are invisible without logging.

## What I Learned

We shipped a messaging product without logging in the outbound send method. When buyers reported not receiving messages, we had no way to trace what happened — did the API call fail? Did it succeed but the message was filtered? Was the recipient number wrong? We were completely blind.

**Why:** The operator was frustrated that we went live without basic observability. The fix was simple (add structured logging) but the damage was already done — lost trust with early users during the critical first-impression window.

**How to apply:** For any new product, logging belongs in the launch checklist alongside tests and deployment. Specifically:
- Log at every inbound webhook (who sent what, when)
- Log at every outbound API call (recipient, message type, success/fail, error details)
- Log database writes for critical operations (invoice created, payment recorded)
- Include correlation IDs so a single user action can be traced end-to-end

## Confidence Notes

- HIGH confidence. This is a universal engineering principle but easy to deprioritize under launch pressure. The memory exists because the agent learned the hard way that "we'll add logging later" means "we'll debug blind when it matters most."
