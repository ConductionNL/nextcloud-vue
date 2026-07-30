# cn-flow-runs-widget

## Why

Every Conduction app runs its flows on OpenRegister's ONE flow engine
(ADR-065). So "what is running right now" has a single answer for the whole
instance — and yet no app can show it without building the same widget again:
a controller or store to call the runs endpoint, a list view, a poll timer, a
status vocabulary, an empty state.

That is exactly the shape this library exists to absorb. One catalog widget,
placed from a manifest, and every app's users see their organisation's live
flow runs with no app-side code at all.

The second, smaller thing: an index page could not open a row into anything
other than a `type:"detail"` page. `config.rowRoute` parsed and validated and
then did nothing, so a manifest that authored it shipped a table whose rows
were dead on click — indistinguishable from a broken table. hermiq's
GraphIndex → GraphDetail (a `type:"custom"` authoring canvas) is the case that
surfaced it.

## What Changes

- **`CnFlowRunsWidget`** (registry type `flow-runs`) — reads OpenRegister's
  `flow-runs/active` surface through the shared `useEndpointSource` engine and
  renders one row per live run: status dot, flow NAME, current step, trigger,
  and a coarse age. Polls (default 15s, floored at 5s, `0` disables), pauses
  while the tab is hidden, and refetches once on return.
- **`CnFlowRunsWidgetForm`** — the config sub-form. Four fields, no data
  source: "which runs" is not a choice.
- **`config.rowRoute` on `type:"index"` pages** — an explicit route/page NAME
  now drives row-click navigation and wins over the register+schema detail
  lookup. A name the router does not have is reported once by name instead of
  rejecting into a silent catch.

## Design decisions

**All non-terminal statuses, not `running`.** A run holds `running` only while a
worker pass executes it, so a widget filtering on it would be empty almost
always — and an empty "running flows" widget looks identical whether the engine
is idle or the filter is wrong. `queued` and `suspended` are where live runs
actually wait.

**It polls.** A run is a moving thing. A snapshot taken at mount would be wrong
within seconds and would look exactly like being right. Hidden-tab pausing keeps
an idle dashboard from being a background request loop.

**No tenant filtering in the widget.** Scoping is the endpoint's job and is
strict there. A client-side filter would be a security control in the one place
a user can edit.

**Row clicks are opt-in.** Without `rowRoute` the rows are inert, which is
correct for an app that has no flow page. When set, the route receives the
FLOW id: a click on a live run means "show me this flow", and a flow page is
what apps that author flows have.

**A shared fixed URL, not a configurable endpoint.** The widget's whole value is
that an app does not describe where runs live. There is one flow engine; making
its address a config field would invite four apps to get it slightly wrong.
