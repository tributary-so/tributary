---
# composable-landing-page-lfmu
title: Cut persona-B sections; merge payments into proof-beat
status: completed
type: task
priority: high
created_at: 2026-06-26T21:06:15Z
updated_at: 2026-06-26T21:13:23Z
parent: composable-landing-page-5558
---

Per ADR-0014: remove persona-B payments-product sections from the main page - Developers (#developers), JWT checkout (#jwt-checkout), 'we're the rails / register as a gateway' (#infrastructure). These serve persona B via docs/app, not the main page. Then merge the payments story INTO the Resolution as the proof-beat: PULL patterns (3 shapes) + the 4,000-pull traction + six-teams evidence become ONE 'proof it runs' beat inside Resolution, framed as 'the simplest config (WHEN=schedule, ROUTE=wallet) is already live = recurring payments, 4,000+ pulls'. Payments is evidence, not a section family. Preserve the data (traction numbers) but relocate it.



## Summary of Changes

Per ADR-0014. CUT three persona-B payments-product sections from the main page: #developers, #jwt-checkout (JWT "easy as a cookie"), #infrastructure ("we're the rails / register as a gateway"). They serve persona B via docs/app. Removed now-unused imports (Terminal, BriefcaseBusiness, TerminalCard, HowToRecurring) and arrays (checklistItems, fnList). MERGED payments into the Resolution as the proof-beat: reframed #payment-models eyebrow "PULL Patterns"->"Proof It Runs", heading "The simplest config is already live.", intro copy now frames the 3 cards as the live PULL axis of the minimal config (WHEN=schedule, ROUTE=wallet = recurring payments, 4,000+ pulls, six teams). The 3 PULL-shape cards remain as evidence. Build clean.
