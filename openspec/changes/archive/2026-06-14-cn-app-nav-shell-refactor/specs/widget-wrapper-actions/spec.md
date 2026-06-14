## ADDED Requirements

### Requirement: default Request-a-feature handler opens CnSuggestFeatureModal

When the user clicks **Request a feature** in `CnWidgetWrapper`'s actions menu AND the host app has NOT bound a `@request-feature` listener, `CnWidgetWrapper` SHALL mount and open `CnSuggestFeatureModal` with the following props auto-filled:

- `app` ← `cnAppId` inject from `CnAppRoot` (the consuming app's slug)
- `page` ← the current `$route.name` (resolves to the manifest page id)
- `surface` ← `widget:${widgetId}` so triage can pinpoint the widget that triggered the request
- `repo` ← `cnFeatureRequestRepo` inject from `CnAppRoot` (the consuming app's `ConductionNL/<slug>` repo)
- `specRef` ← the widget's `specRef` prop when present, otherwise undefined
- `conductionSubmitEnabled` ← `false` (no Conduction Contactmoment intake from widgets yet — Path A only)

The `@request-feature` event SHALL still be emitted before the default fires, so a host listener (when present) can call `event.preventDefault()` to suppress the default and handle the action itself.

#### Scenario: default opens modal with widget context

- **GIVEN** `CnWidgetWrapper` is rendered inside a `CnAppRoot` for app `pipelinq` on route `Dashboard`
- **AND** the widget id is `outgoing-calls-daily`
- **AND** the host binds no `@request-feature` listener
- **WHEN** the user clicks "Request a feature"
- **THEN** `CnSuggestFeatureModal` mounts and opens
- **AND** its `app` prop is `"pipelinq"`, `page` is `"Dashboard"`, `surface` is `"widget:outgoing-calls-daily"`
- **AND** the `repo` is resolved from `CnAppRoot`'s `cnFeatureRequestRepo` inject

#### Scenario: host listener calls preventDefault to suppress modal

- **GIVEN** the host binds `<CnWidgetWrapper @request-feature="onRequest">` with a handler that calls `event.preventDefault()`
- **WHEN** the user clicks "Request a feature"
- **THEN** the host handler fires first
- **AND** the built-in `CnSuggestFeatureModal` does NOT mount

#### Scenario: missing CnAppRoot ancestor falls back silently

- **GIVEN** `CnWidgetWrapper` is mounted with no `CnAppRoot` ancestor
- **AND** the `cnFeatureRequestRepo` inject resolves to `null`
- **WHEN** the user clicks "Request a feature"
- **THEN** the default handler logs a `console.warn` ("Cannot open feature request modal: missing cnFeatureRequestRepo inject")
- **AND** no modal is mounted
- **AND** no error is thrown

---

### Requirement: default Refresh handler emits on cn:widget:refresh event-bus channel

When the user clicks **Refresh** in `CnWidgetWrapper`'s actions menu AND the host app has NOT bound a `@refresh` listener, `CnWidgetWrapper` SHALL emit on the `@nextcloud/event-bus` channel `cn:widget:refresh` with payload `{ widgetId: string, title: string }`. Widgets SHOULD subscribe to this channel and filter by `widgetId` to re-fetch their data source.

The `@refresh` event SHALL still be emitted before the default fires, so a host listener (when present) can call `event.preventDefault()` to suppress the event-bus emit.

The event-bus channel name `cn:widget:refresh` is a stable public contract; renaming it is a breaking change.

#### Scenario: default emits on event-bus

- **GIVEN** `CnWidgetWrapper` for widget `outgoing-calls-daily` with no `@refresh` listener
- **WHEN** the user clicks "Refresh"
- **THEN** an event is emitted on the `@nextcloud/event-bus` channel `cn:widget:refresh`
- **AND** the payload is `{ widgetId: "outgoing-calls-daily", title: "Outgoing calls — daily" }`

#### Scenario: subscribed widget re-fetches on matching id

- **GIVEN** a widget subscribes to `cn:widget:refresh` and matches by its own `widgetId`
- **WHEN** the user clicks Refresh on the wrapper for that widget id
- **THEN** the widget receives the event and triggers its re-fetch path

#### Scenario: subscribed widget ignores other ids

- **GIVEN** a widget subscribed to `cn:widget:refresh` with id `"outgoing-calls-daily"`
- **WHEN** the bus fires with `widgetId: "calls-hourly"`
- **THEN** the first widget's subscriber callback runs but its id-filter rejects the payload
- **AND** the widget does NOT re-fetch

---

### Requirement: widget refresh opt-in contract documented

`CnWidgetWrapper.md` SHALL document three opt-in modes a widget MAY use to respond to a Refresh click. All three SHALL be valid; consumers MAY combine them. The documentation SHALL identify the ref-callable method as the canonical recommendation for new widgets.

The three modes are:

1. **`refreshTrigger` reactive prop** — the widget accepts a `Number` prop (typically a `Date.now()` timestamp); `CnWidgetWrapper` increments / replaces the value on Refresh; the widget watches it and re-fetches on change.
2. **Ref-callable `refresh()` method** (canonical) — the widget exposes a `refresh()` instance method; `CnWidgetWrapper`'s default Refresh handler calls it via the widget's ref when both the ref and the method exist.
3. **Event-bus subscription** — the widget subscribes to `cn:widget:refresh` directly via `subscribe('cn:widget:refresh', ...)` and filters on `payload.widgetId`. Useful when the widget body cannot easily expose a ref.

#### Scenario: docs cover all three modes

- **GIVEN** the published `cn-widget-wrapper.md` reference doc
- **THEN** it contains an "Opting into Refresh" section
- **AND** each of the three modes is documented with a minimal code example
- **AND** the ref-callable `refresh()` method is labelled as the canonical recommendation
