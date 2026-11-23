# The widget dialog can show the host's notices

## Why
launchpad's cross-widget filter (`drill-down-cross-widget-filter` task 9) checks a widget's `publishes` and `consumes`
against the dashboard and finds, for example, a consumed dimension no hierarchy publishes. That finding belongs next to
the widget's settings, which live in CnAddWidgetModal, and the dialog had no place for a host to say anything.

## What changes
CnAddWidgetModal takes `notices`: `[{ text, type?, id? }]`, each shown as a note card above the form (`warning` by
default), and a `notices` slot for anything richer. Without notices the dialog renders as before.
