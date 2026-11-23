# code-frame Delta: sandboxed-code-frame

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sandboxed-code-frame](../../)

## Purpose

Code that an app owner writes runs in a sandboxed frame that cannot
reach the person's session, and talks to the page through three checked
requests. Expressions on columns and form fields run in one such frame
per page. The library half of buildiq `pages-custom-code`, REQ-BQCC-003
and REQ-BQCC-004; rows `pg-custom-js` and `pg-custom-code-component`
(buildiq matrix).

## ADDED Requirements

### Requirement: A code page or code widget renders in a fixed sandbox

A `type: custom` page with `config.code`, and a widget with
`widgetKey: "code"` and a `code` block, SHALL render through
`CnCodeFrame`. `CnCodeFrame` SHALL mount an iframe whose `sandbox`
attribute is exactly `allow-scripts`, with no `allow` attribute and
`referrerpolicy="no-referrer"`. No prop or manifest key SHALL change the
sandbox value. The frame SHALL load only the URL returned by the host's
`codeFrameUrl` resolver, and only when that URL is same-origin with the
page. Without a resolver, without a signed-in user, or with a URL that
fails the check, it SHALL render the placeholder "Code for this part
cannot run here." and SHALL create no frame.

#### Scenario: A floor plan draws in a frame

- GIVEN a detail page of `gebouw` with a widget `plattegrond` of `widgetKey: "code"` and inputs `object`, in buildiq with a `codeFrameUrl` resolver
- WHEN a caretaker opens building 7
- THEN the widget holds an iframe with `sandbox="allow-scripts"` loading buildiq's document for `plattegrond`
- AND the frame receives building 7 as `object`

#### Scenario: Code cannot use the caretaker's session

- GIVEN a code widget whose script reads `document.cookie` and requests `/ocs/v2.php/cloud/user`
- WHEN the caretaker opens the page
- THEN reading the cookie throws in the frame, the request is not sent with a session
- AND the rest of the page keeps working

#### Scenario: A hybrid app without a resolver shows a placeholder

- GIVEN an app rendering a buildiq manifest in its own `CnAppRoot` without `codeFrameUrl`
- WHEN a user opens a page with a code widget
- THEN the widget shows "Code for this part cannot run here." and no iframe exists in the page

### Requirement: The page checks every message from a frame

The page SHALL drop a message from a frame unless its `event.source` is
that frame's own `contentWindow`, its `event.origin` is the string
`"null"`, and its data is a plain object of at most 64 KB as JSON that
carries the mount's `channel` and an allowed `type`. A message with any
other origin SHALL remove the frame. A second `load` event on a frame
SHALL stop the page posting to it, remove it and show "This part stopped
because it tried to open another page." The page SHALL post only the
inputs the manifest declares, copied as JSON, and SHALL never post a
request token or any credential.

#### Scenario: A message from another frame is ignored

- GIVEN two code widgets on one dashboard
- WHEN the first widget's script posts a `notice` carrying the second widget's channel
- THEN no toast appears

#### Scenario: A frame that navigates itself is stopped

- GIVEN a code widget whose script sets `location` to another page of the instance
- WHEN the frame loads the second document
- THEN the widget shows "This part stopped because it tried to open another page."
- AND the page posts nothing more to it

### Requirement: The frame asks, the page decides

A code frame SHALL change anything only through `navigate`, `notice` or
`setField`. `navigate` SHALL name a page id in the manifest and only that
route's parameters. `notice` SHALL show plain text of at most 200
characters, at most once every two seconds per frame. `setField` SHALL
be accepted only when the frame has the `object` input, for a schema
property that is not `readOnly`, with a value of the property's type.
The page SHALL write the record the page shows, never one the message
names, with `saveObject` under the person's own session. A refused write
SHALL show "You cannot change this record." and leave the record as it
was. Any other message type SHALL be dropped.

#### Scenario: A field change respects the person's rights

- GIVEN a reader with read-only access to `gebouw` 7, on a page whose code widget posts `setField` for `status`
- WHEN the widget posts the message
- THEN OpenRegister refuses the write, the record is unchanged
- AND the page shows "You cannot change this record."

#### Scenario: A frame cannot send the person to another site

- GIVEN a code widget that posts `navigate` with page `https://example.org`
- WHEN the page receives it
- THEN nothing happens, because no manifest page has that id

### Requirement: Expressions run in one sandboxed frame per page

`CnDataTable` SHALL compute a column with `expression` over `row`,
`user` and `route`, and `CnFormPage` SHALL compute `expressionDefault`
and `visibleWhen.expression` over `values`, `user` and `route`, through
one evaluator frame per page with the same sandbox, created only when
the page has an expression. A batch without an answer after one second
SHALL remove the evaluator frame. A failed or timed-out cell SHALL render
empty with a marker titled "Could not compute this value". A failed
`visibleWhen.expression` SHALL hide the field. No expression SHALL run in
the host page.

#### Scenario: A column shows a computed total

- GIVEN an index page of `bestelling` with a column `expression: "row.aantal * row.prijs"`
- WHEN a buyer opens the page with an order of 3 at 12.50
- THEN that row's cell shows 37.5

#### Scenario: An endless expression does not stop the table

- GIVEN a column whose expression never returns, in a browser that runs sandboxed frames in their own process
- WHEN the page renders
- THEN after one second the column's cells show the marker and the other columns show their values

### Requirement: The manifest declares code and expressions in typed keys

The manifest v2 schema SHALL accept `config.code` on a `type: custom`
page, a `code` block `{ html, css, js, inputs }` on a widget entry with
`widgetKey: "code"`, `expression` on a column, `expressionDefault` on a
form field and `expression` in a form field's `visibleWhen`.
`validateManifestV2` SHALL refuse `config.code` beside `component`, a
`code` block on another widget key, a `code` widget without `id`, an
`inputs` entry outside `object`, `rows`, `route` and `user`, and
`visibleWhen.expression` outside a form field.

#### Scenario: A code block on a chart widget is refused

- GIVEN a manifest with a widget of `widgetKey: "chart"` carrying a `code` block
- WHEN `validateManifestV2` runs
- THEN it fails naming the widget and saying a `code` block needs `widgetKey: "code"`
