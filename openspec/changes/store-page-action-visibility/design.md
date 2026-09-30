## Context

`CnStorePage` is the `type: "store"` page. `CnPageRenderer` flattens a page's `config`
into top-level props (`{ ...topLevel, ...config, ...params }`), so any key an app puts in
the page config reaches the component as a prop. The component today hardcodes one
visibility rule, `getCurrentUser()?.isAdmin === true` for Install, and has no Publish
action. The fleet's manifest sentinel vocabulary resolves app config (`@resolve:`,
`@config.`), routes and workspace state, but has no per-user token (`@runtime` is
deprecated), so a manifest cannot compute "this user may install" by itself. The app
that knows the answer (learniq, through its ADR-023 action matrix) resolves it at boot
from initial state and writes it into the page config.

## Goals / Non-Goals

**Goals:**
- An app decides who sees Install and who sees Publish, with booleans it resolved.
- An app that sets nothing renders exactly what it rendered before.
- Publish leads to the app's own publish surface.

**Non-Goals:**
- Publishing from inside the component. What a publish sends and which checks run first
  (learniq: licence, author, no pupil data, recorded consent) are app-specific, like
  install (ADR-080 Decision 3).
- A new sentinel token or a `visibleIf` predicate on buttons. The app already resolves
  the answer server-side; a second rule language in the page would be a second place to
  get it wrong.
- Server-side enforcement. That stays with each app's endpoints.

## Decisions

### D1: Tri-state booleans, `null` means "the app did not say"

`canInstall` and `canPublish` are `{ type: Boolean, default: null }`. Vue 3 keeps an
explicit `default` for an absent Boolean prop, so an absent prop is `null`, not `false`.
`null` falls back to the administrator rule, which is today's behaviour for Install.
Considered: `default: false`. Rejected, because every existing store page would lose its
administrator Install button. Considered: an `actions` object prop. Rejected, because
`actions` is already a page-level field the renderer lifts for other page types, and two
flat booleans read the same in a manifest and in a host template.

### D2: Publish needs a destination, so no route means no button

`publishRoute` is a route name (string) or a route location (object). The header button
renders only when the route is set and publishing is allowed. Considered: rendering the
button whenever `canPublish` is true and emitting a `publish` event. Rejected, because
`CnPageRenderer` wires no listener for such an event on a manifest page, so the button
would do nothing for every manifest-driven app. A route works for both a manifest page
and a host that renders the component directly. A string is a route NAME, matching how
manifest menu entries name routes (`"route": "Store"`).

### D3: Navigation through `this.$router`, no hard dependency on vue-router

The click calls `this.$router.push(target)`. The component is always mounted under an
app router when it is a page; a host without a router gets no error, only no navigation.
Considered: `NcButton :to`. Rejected, because it renders a `RouterLink` that must be
resolvable in every host and in unit tests, for no gain over a click handler.

### D4: The old `canInstall` computed becomes `showInstall`

A prop and a computed cannot share a name. The computed was internal; no consumer or test
reads it by name (`git grep canInstall` finds only the component).

## Risks / Trade-offs

- [An app shows a button its server refuses] → the docs state that visibility is
  presentation only, and learniq's endpoints keep `requireAction()`. A mismatch shows as
  a 403 the page already reports.
- [An app passes `canInstall: true` and forgets the server check] → out of the
  component's reach by design; ADR-023 and the hydra IDOR gate cover the endpoint.
- [A consumer on an older library] → unknown config keys fall through as harmless DOM
  attributes, so an app may write the keys before it upgrades. Learniq relies on this.

## Seed Data

None. This change adds no schema, register or object; it is a presentation component.

## Declarative-vs-imperative decision

Not applicable: no lifecycle, aggregation, calculation, notification, relation or widget
is introduced.
