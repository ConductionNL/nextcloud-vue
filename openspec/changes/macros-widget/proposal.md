# Proposal: macros-widget

## Why

DqZaakAssistent draws a "Macro's" card in the case's AI-toezicht tab: several steps at once, each with an "Uitvoeren"
button, and a line saying which ran last. OpenRegister already has macros: a declared action
(`configuration['x-openregister-action']`) with `macro: true` and a bound manual flow, run as the person through
`POST /api/objects/{register}/{schema}/{id}/actions/{action}`, with an `action.macro` audit entry per run. No library
widget lists or runs them, so an app cannot place them.

## What changes

A widget type `macros` (`CnMacrosWidget`) lists the macros of the record's schema in declaration order, runs the
pressed one through the declared-action endpoint, asks the page to refresh, shows a refusal in words, and reads the
last run from the record's audit trail (left out when the trail cannot be read). `declaredMacros()` reads the macros
off a schema.

## Scope

Additive. It adds no rights: OpenRegister checks the action's own right on every run.

## Not covered

The board's "2 wijzigingen: termijn opgeschort, bericht verstuurd" needs the changes a run made; the audit entry names
the run but not its writes. Listed for OpenRegister rather than computed here.
