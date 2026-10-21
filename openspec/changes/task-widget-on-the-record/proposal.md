# Proposal: task-widget-on-the-record

## Why

dossiq's case task pane (1,094 lines) duplicates CnTasksWidget's table to add four things the widget lacks: completing
through the app's own route (which checks the case type's form first), claim only where the engine can claim, a task's
form, and working on the first open task in place. openregister and buildiq show the same engine's tasks.

## What changes

CnTasksWidget takes `completeUrl` (also on CnTaskFormDialog), `claimCapabilityUrl`, opens CnTaskFormDialog for a task
with a form, and offers `variant: "focus"` and table `expandRows`, which show a task in a work card with its number,
handler, deadline, lock, candidates, its form inline and its verbs. CnTaskFormDialog's field rows are exported as
CnTaskFormFields.

## Scope

Additive: without the new keys every component behaves as before.
