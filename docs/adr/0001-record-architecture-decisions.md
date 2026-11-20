# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Human
- **Requires human acceptance:** yes

## Context
Several AI agents work in parallel. Decisions made in chat or inside one agent's session get lost, and later agents contradict them.

## Decision
Record consequential decisions (architecture, interfaces, data, security, deployment, anything costly to reverse) as numbered Markdown ADRs in `docs/adr/`, using `0000-template.md`. An ADR that governs implementation must be **Accepted** before dependent tickets become Ready. Accepted ADRs are never edited in substance. Replace them by superseding. Smaller decisions and working assumptions go in `docs/delivery/decision-log.md`.

## Consequences
Tickets and PRs link their governing ADRs. The supervisor checks ADR status at gate G1. Reference: https://martinfowler.com/bliki/ArchitectureDecisionRecord.html
