# Proposal: audit-trail-action-labels

## Why

DqTaak's history reads "Taak opgepakt door Pieter Jansen" and "Taak aangemaakt". The trail card showed the engine's raw
words, `create (active)`, with the actor on the line under it.

## What changes

`actionLabels` on CnAuditTrailCard (and `content.actionLabels` on the `audit-trail` widget, through the app's translate)
words each action, by action or by action and state, with `{actor}` and `{state}` filled in. A label that names the actor
leaves it off the line under it. Unlabelled actions show as before.

## Scope

Additive. No schema change: a widget's `content` is free-form.
