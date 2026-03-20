---
domain: saas-engineering
task_class: ad-creative-production
format: experience-narrative-b
source: real agent operational memory (sanitized, redacted)
type: feedback
---

# Automated ad creative pipeline beats manual tools

## When This Applies

When an agent is helping produce marketing creatives (video ads, static images, social media content) for a product, especially when rapid A/B testing of variants is needed.

## What I Learned

Instead of using manual tools (Canva, CapCut, screen recording), we built a fully automated pipeline:

- **Storyboard HTML files** — full animated promo videos written in pure HTML/CSS/JS, viewable in any browser
- **Conversation mockup HTML** — multi-scene simulations of chat interfaces (works for WhatsApp, iMessage, or any messaging UI)
- **Headless browser recording** — Puppeteer captures frames, ffmpeg encodes to MP4
- **Static export** — same HTML rendered as screenshots at production ad resolutions (1080x1080, 1080x1920)

To create an A/B test variant: edit text strings in the HTML, preview in browser, run the recording script. New variant in ~5 minutes of editing + 40 seconds of recording.

**Why:** The operator discovered this was dramatically faster than manual creative workflows. The key insight is that ad creatives for tech products are mostly text + UI mockups — these are trivially representable as HTML, which is version-controllable, parameterizable, and automatable.

**How to apply:** When the operator asks to create ad variants or marketing content:
1. Don't suggest Canva/CapCut/manual screen recording
2. Build HTML-based storyboards that can be recorded via headless browser
3. Store creatives as code (HTML files) so variants are just text edits
4. Use Puppeteer + ffmpeg for video, Puppeteer screenshots for statics

## Confidence Notes

- HIGH confidence. Pipeline was built and used in production. The time savings are real and substantial — especially for iterative A/B testing where you might need 10+ variants.
