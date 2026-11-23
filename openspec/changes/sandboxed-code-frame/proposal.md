---
kind: code
depends_on: []
---

# Proposal: sandboxed-code-frame

## Why

An app owner in buildiq wants to write a small piece of code when the
built-in parts are not enough: a floor plan drawn from a record, or a
column that multiplies two fields. That code then runs in the browser of
every person who opens the app, with their data on screen. If it ran in
the page, it could read their session and act as them.

The library renders every buildiq app. So the library decides where maker
code runs. Today it has no place for it at all: a `type: custom` page and
a widget name a component that someone compiled into the host app, and a
column takes a fixed formatter id. This change gives maker code one place
to run, a sandboxed frame, and one narrow way to talk to the page.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `pages-custom-code`. Its proposal, section "Sibling halves":

> nextcloud-vue: the renderer. It owes `CnCodeFrame`, which mounts the
> sandboxed iframe for a code component and carries the message protocol,
> and an expression evaluator that runs a page's expressions in one
> sandboxed frame and hands the values to `CnIndexPage`, `CnDetailPage`
> and `CnFormPage`. It also owes the manifest keys: `config.code` on
> `type: custom` pages and on widgets, `columns[].expression`, and
> `expression` on `formField` defaults and `visibleWhen`

Its design, D3: "The protocol and the frame belong to nextcloud-vue (see
proposal); buildiq authors the manifest and serves the documents." Its
task T06 asks for this change to cite REQ-BQCC-003 ("Maker code runs only
in the sandbox") and REQ-BQCC-004 ("The frame asks, the page decides").
This change implements both on the library side.

The rows that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `pg-custom-js` | Write JavaScript expressions to bind or transform values on a page. |
| buildiq | `pg-custom-code-component` | Drop in a custom component written in code when the built-in ones are not enough. |

## What changes

- A new component, `CnCodeFrame`, mounts one maker document in an
  `<iframe sandbox="allow-scripts">`. The sandbox value is fixed. No prop
  or manifest key can widen it.
- A `type: custom` page with `config.code`, and a widget with
  `widgetKey: "code"` and a `code` block, render through `CnCodeFrame`.
- The page hands the frame only the inputs the manifest declares:
  `object`, `rows`, `route`, `user`. It never hands it a token.
- The frame may ask for three things: `navigate`, `notice` and
  `setField`. The page checks each request against the manifest and the
  schema, and does it with the person's own rights. It drops anything
  else.
- An expression evaluator, one sandboxed frame per page, computes
  `columns[].expression`, `expressionDefault` on a form field and
  `visibleWhen.expression` on a form field.
- The manifest v2 schema gains those keys.
- The frame-side half of the protocol ships in the library as two
  plain scripts. buildiq puts them into the documents it serves.

## Affected projects

- `nextcloud-vue`: new `CnCodeFrame` and `useExpressionEvaluator`,
  `CnPageRenderer`, `CnWidgetGrid`, `CnDataTable`, `CnFormPage`,
  `CnAppRoot` (one new prop), the manifest v2 schema,
  `validateManifestV2`.
- Consumers: buildiq, and any hybrid app that renders a buildiq manifest
  in its own `CnAppRoot`.

## Cross-project dependencies

- buildiq owes the document route of its D2, the owner-only save rule of
  its D6, and the `codeFrameUrl` resolver this change adds to
  `CnAppRoot` (design D2). Without a resolver, code renders as a
  placeholder.
- buildiq's evaluator document needs `'unsafe-eval'` in its script
  policy (design D6). Its D2 allows inline script only, and an evaluator
  that receives expression text by message has to compile it.

## Backward compatibility

Every key is new. A manifest without `config.code`, a `code` widget or an
expression renders exactly as before, and no frame is created. The
evaluator frame exists only on a page that declares an expression.

## Out of scope

- The code editor, the "fx" toggle and the owner-only save rule. Those
  are buildiq's.
- Network access from maker code. Code that needs data gets it from the
  page.
- Code on public pages. buildiq serves no public document (its D2), so
  `CnCodeFrame` shows the placeholder there.
- Server-side calculated fields. OpenRegister's
  `x-openregister-calculations` already cover those.
