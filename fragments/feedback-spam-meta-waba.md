---
domain: saas-engineering
task_class: whatsapp-integration
format: experience-narrative-b
source: real agent operational memory (sanitized)
type: feedback
---

# Platform-generated spam during testing is not a code bug

## When This Applies

When building on WhatsApp Business API (or similar platform APIs) and the developer or testers notice increased spam or unsolicited messages on phone numbers involved in testing.

## What I Learned

During testing of a WhatsApp-based product, the operator noticed increased spam on their phone. Initial instinct was to look for a code bug — was our app leaking numbers? Was there an open endpoint?

Root cause: **Meta classifies numbers registered with WhatsApp Business API as business entities**, which exposes them to business-targeted advertising and outreach. This is platform behavior, not an application bug.

Key distinction:
- The **business number** (registered with WABA) gets classified and exposed — this is expected and affects only the dedicated business SIM
- **End user numbers** that message the bot are NOT registered as business numbers — they use their personal WhatsApp as customers normally would
- The developer's personal number used to RECEIVE test messages is also unaffected — only the registered sender number is exposed

**How to apply:** When investigating spam during WABA testing:
1. Don't waste time auditing your own code for number leaks
2. Check whether the spam is arriving on the registered business number (expected) or personal numbers (unexpected — investigate further)
3. Don't flag this as a risk to end users — the exposure only affects the registered business number
4. Use a dedicated SIM for the business number, not a personal number

## Confidence Notes

- HIGH confidence. Confirmed through direct investigation. This is a known WABA platform behavior but poorly documented — most developers encounter it and initially assume it's their fault.
