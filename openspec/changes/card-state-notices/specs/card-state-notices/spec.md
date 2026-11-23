# card-state-notices Delta: card-state-notices

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [card-state-notices](../../)

## Purpose

A card, table, dialog or list page shows what just happened to it inside itself, in the server's words, with a button where the board draws one, instead of a toast that leaves the card.

## ADDED Requirements

### Requirement: A notice is a card state banner

The `notice` content SHALL take `role` (`status`, `alert` or `note`), `layout` (`inline` or `stacked`), `actions` (`[{ label, action, variant? }]`) and `dismissible`. Drawn inside a card (`inline`), the role SHALL default to `alert` for the `error` variant and `status` otherwise; as a widget it SHALL stay `note`. Each action SHALL be dispatched through the page dispatcher with `@objectId` and `@object.<path>` resolved; a dismissible notice SHALL draw a close button named "Close". `{path}` in the title and text SHALL be filled from the record, and a path the record does not hold SHALL read empty.

#### Scenario: A refusal on the task card

- **GIVEN** a notice `{ variant: "error", text: "Annuleren geweigerd ..." }` in the tasks card
- **THEN** it is drawn with `role="alert"` above the task table

#### Scenario: A partial result with a button

- **GIVEN** a notice with `actions: [{ label: "Mislukte acties bekijken", action: { type: "open-modal", target: "FailedActions" } }]`
- **WHEN** the button is pressed
- **THEN** the modal action is dispatched through the page dispatcher

### Requirement: A card draws its notices at the top

CnWidgetWrapper, CnDetailCard, CnDataTable and CnDialog SHALL take a `notices` list and a `#notice` slot and SHALL draw the notices above their body. Each notice SHALL show only while its `visibleWhen` holds against the card's record (the shared async grammar). A closed notice SHALL stay away until the list changes, and the card SHALL emit `notice-dismiss`. CnDialog SHALL draw them under its header, or above the footer with `noticesPlacement: "bottom"`.

#### Scenario: A negative advice

- **GIVEN** a card notice with `visibleWhen: { source: { register, schema, filter: { case: "@objectId", outcome: "negative" } }, op: "gt", value: 0 }`
- **THEN** it shows only while the case has a negative advice

### Requirement: A detail widget declares its notices

A detail page widget definition SHALL take `notices` (a list of notice contents), drawn by the card that titles the widget. The widget host SHALL hand the page dispatcher a `showNotice` for every action run from its card (header and body actions, and actions its renderer dispatches), and SHALL take a notice raised on the `cn:page:notice` event-bus channel with its `widgetId`. The next action from the card SHALL clear the earlier answer.

### Requirement: An action answer becomes a notice in its card

An `api-call`, `agent` or run-node answer SHALL become a notice in the card it ran from when the surface passed `showNotice` and either the response body carries `notice` (`{ variant?, role?, title?, text, actions? }`, success or refusal) or the action sets `noticeInline: true` (a refusal then reads the server's message as an error notice, a success the action's `successMessage` as a success notice). Otherwise the toast SHALL be shown as before.

#### Scenario: An engine refusal envelope

- **GIVEN** a cancel action that answers 409 with `{ notice: { variant: "error", title: "Annuleren geweigerd voor Documenten beoordelen:", text: "..." } }`
- **WHEN** it runs from the tasks card
- **THEN** the card shows that notice and no error toast is shown

### Requirement: An index page draws its notices above the list

CnIndexPage SHALL take `notices` (manifest `config.notices`) and draw them above the list card. A row `api-call` answer that asks for a notice, and a notice raised on `cn:page:notice` without a `widgetId`, SHALL be drawn there too, replacing the earlier one.

#### Scenario: A source that is down

- **GIVEN** `config.notices: [{ variant: "warning", title: "Bron niet beschikbaar: taken uit pipelinq.", text: "...", visibleWhen: { endpoint: "/apps/dossiq/api/queue/sources", field: "pipelinq.ok", value: false } }]`
- **THEN** the banner is drawn above the queue while the source is down
