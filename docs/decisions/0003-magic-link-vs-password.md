# 0003 — Magic-link sign-in (no password)

**Status:** Rejected (2026-05-23) · superseded by [ADR 0006](0006-password-plus-magic-link.md)

## Context

Our users are financial advisors and FMO admins. They sign in occasionally,
from multiple devices, on a mix of personal and shared computers. Passwords
for low-frequency apps mostly live in browser autofill or sticky notes;
either way, "I forgot my password" support tickets are the dominant cost.

## Decision (rejected)

Magic-link only for v1. The login page is one input — email — and a button.
Supabase emails a link, the user clicks it, the callback Route Handler sets
the session cookie. No password field, no "forgot password" flow.

## Why this was rejected

A password-only path is worth keeping for users who don't want to fish a
link out of their inbox every time, and for cases where magic-link email
deliverability is unreliable for a specific firm's IT setup. ADR 0006
takes the both-available approach instead.
