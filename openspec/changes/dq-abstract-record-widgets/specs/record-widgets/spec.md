# record-widgets Delta: dq-abstract-record-widgets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dq-abstract-record-widgets](../../)

## Purpose

The parts of a record page that apps wrote as their own components, as configurable library widgets.

## ADDED Requirements

### Requirement: A banner can read the page's record

A `banner` whose `visibleWhen` names only a `field` SHALL decide on the page's record (the injected object context, else
the `objectData` prop) and SHALL use that record as its subject, so `{subject.<path>}` in its texts fills from it. A
banner SHALL be decided again when the record changes. When a subject token leaves `lead`, `text` or `reason` empty, the
banner SHALL show `fallbackLead`, `fallbackText` or `fallbackReason` instead. A note banner whose lines are all empty
SHALL render nothing. A `visibleWhen.endpoint` MAY name the record (`@objectId`, `@object.<field>`); it SHALL NOT be
requested before the record is known, and its whole answer SHALL be the subject. A `visibleWhen.source` MAY carry
`extend`, sent as `_extend[]`.

#### Scenario: An archived record

- **GIVEN** a banner with `visibleWhen { field: "@self.archived", op: "notEmpty" }` and a lead naming `{subject.@self.archived.by}`
- **WHEN** the record's marker names nobody
- **THEN** the banner shows its `fallbackLead`

### Requirement: Sections can stack without dividers

With `dividers: false`, the `sections` widget SHALL stack its shown sections 8px apart with no rule between them.

### Requirement: Opening a tab marks its part read

With `badgeSource: "readState"` the tabs widget SHALL, when a tab whose part of the record has an unread count is
opened, send `PUT .../read-state` with `{ subResource }` (the tab's `unreadKey`, else its id, else its widget id) once,
and drop that tab's count. A refused write SHALL keep the count. A tab with an unread count SHALL carry a visually
hidden "N new" after its name.

### Requirement: A record can carry an attention flag

The `attention-flag` widget SHALL read a flag from `content.endpoint`, and raise or clear it by POSTing `{ reason }` to
`raisePath` or `clearPath`. The act SHALL be disabled while the reason is empty, and a refusal SHALL show the server's
sentence as an alert. Markers SHALL be read from the record at `markersPath`, each labelled by `panelLabels[tab]`. An
assessment SHALL show only when the record carries one, with "Due for review" after a review date before today. After
an act the widget SHALL emit `object-changed`, dispatch the changed-objects signal and ask the page to refresh. A failed
read SHALL render nothing.

### Requirement: A record can explain its status

The `status-explainer` widget SHALL read `content.endpointSource` and show, from the configured paths, what a derived
status is missing, the status explanation, each withheld move with its first reason, who the record waits on, and the
dwell with a breach chip. It SHALL show the record's `@self.fieldRules` as one line per kind, also when the endpoint
failed. It SHALL render nothing when there is nothing to say.

### Requirement: A map can plot the objects that point at a record

A `map` widget's `markers.dataSource.filter` SHALL resolve `@objectId` and `@object.<field>` against the page's record.
An object at (0, 0) SHALL NOT be plotted. A source that answered no markers SHALL show `content.emptyText` when set; a
source that failed SHALL show `content.errorText` (or a default) as an alert. The event named by `content.refreshOn`
SHALL read the markers again, and with `content.refreshMatch` only when the payload's field holds the record's id.

### Requirement: A line can be chosen by condition

`conditionalLine` SHALL return the first candidate whose local `when` holds and whose template fills, else ''.

### Requirement: A facts card can show progress

A facts entry with `as: "progress"` SHALL draw the percentage at `path` as a `role="progressbar"` with
`aria-valuenow`, unless `barWhen` does not hold, and SHALL show the first applying sentence of `lines`. Any entry MAY
carry `when`, a local condition that leaves it out when false.

### Requirement: A facts card can act when it is empty

`source.path` SHALL read the facts from that part of the source's answer. When there are no facts, the card SHALL show
`emptyText` and the buttons of `emptyActions`, dispatched with the record's tokens resolved. A failed read SHALL show
`errorText` as an alert with a Try again button. A card without fields and without `emptyText` SHALL show nothing when
it has no facts.

### Requirement: A facts link can point into another app

`link.href` MAY be a template over the record. A value that is not a URL SHALL be put under `link.hrefBase`. Only http,
https and paths on this server SHALL be linked. `link.target: "_blank"` SHALL open a new tab with
`rel="noopener noreferrer"`.

### Requirement: Notes can notify and act without a wrapper

CnNotesTab SHALL POST the `mention` payload to `mentionUrl` when set. A note action with an `endpoint` SHALL POST
`{ note }` there and say the outcome: `sent` as a success, `failed` as an error, anything else as a warning, each with
the server's `reason` else the action's message. The notes integration widget SHALL render CnNotesTab when it is given
`mentionUrl` or `noteActions`.

### Requirement: The redaction editor is a page type

The `redaction` page type SHALL mount CnRedactionEditor with the page config as props. Without a `crumbs` slot the
editor SHALL draw `breadcrumbs`, each label filled from the record read through `recordSource`, else its `fallback`.

### Requirement: A record shows its parties by role

The `parties` widget SHALL read a record's parties from OpenRegister's party model (`rolesSource`, default the
record's `/parties`) and draw them grouped by role, the group holding the primary party first and the primary party
first within it, each role labelled by `roleLabels`, else the listing's label, else its key. Each party SHALL show its
kind, whom it is represented by (role rows from `rolesObjects`), its `extraLines` (the first applying candidate per
line, coded values labelled by `valueLabels`) and its correspondence counts. Every indicator SHALL carry its verdict,
and a blocking verdict (`refuse-publication`, `refuse-send`) SHALL also show as a note above the list. A kind outside
the accepted kinds SHALL be marked only when the kinds came from the `kindsSource.enforce` source. A failed listing
SHALL say so and SHALL NOT show as an empty list.

### Requirement: A record list can act on its rows and link onwards

With `requiresApp` naming an app that is not installed, the record list SHALL show `absentText` and read nothing.
`rowActions` SHALL draw an actions menu on each row that opens nothing, named by `rowActionsLabel`; an entry with an
`endpoint` SHALL call it with the page's `@objectId` and the row's `{field}` tokens filled in and read the list again,
showing the server's refusal as an alert; any other entry SHALL be dispatched as `rowAction` is. `links` SHALL draw a
line naming the records at its field, each linked by `route` and labelled from `labelSource`. A `count` badge SHALL
count a list or number on the row and show nothing at 0. `intro` SHALL draw a line above the list. A template MAY be a
list of candidates.

### Requirement: Grouped cards can join a flat list and flag a card

With `itemsPath` and `itemGroupField`, the grouped cards SHALL read the cards from one flat list and put each under
the group whose `id` it names; cards naming no group SHALL gather under `ungroupedTitle`. `groupLines` SHALL draw the
lines that fill under a group's title. `itemFlag` SHALL mark a card in words. A failed read SHALL offer Try again. A
nested record SHALL stay readable by path (only a map of language codes reads as one text).

### Requirement: Related objects can read extra sections from endpoints

`extraSources` SHALL add sections read from app endpoints, one per source or, with `groupBy`, one per group label.
`requireLabel` SHALL leave out a row whose label is empty or only an id. A `static` row SHALL open nothing; a
`rowRoute` row SHALL open its route. `rowActions` SHALL be buttons under a row whose `when` holds, calling their
endpoint and reading the sources again, the server's refusal shown as an alert. `children` SHALL list links under a
row. `referenceSections` SHALL name the record a field points at, only with a readable title. `footerActions` SHALL be
dispatched with the record's tokens resolved. A source that fails SHALL be logged and leave the rest alone.
