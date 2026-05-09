# Design: Manifest settings rich sections

## Investigation findings

### `CnSettingsPage` (existing, shipped on `feature/manifest-v1`)

Renders a flat list of `CnSettingsCard` + `CnSettingsSection` per
`config.sections[]`. Each section's `fields[]` array drives a small
input dispatcher: `boolean → NcCheckboxRadioSwitch`, `number / string /
password → NcTextField`, `enum → NcSelect`. Every field is hand-bound
to a `formData[field.key]` slot, persisted to `axios.put(saveEndpoint,
formData)` on save. A `#field-<key>` scoped slot exists per field for
single-input bailout, and global `#header` / `#actions` slots wire the
manifest's `headerComponent` / `actionsComponent`.

Implication: today the only way to put `CnVersionInfoCard` inside a
`CnSettingsPage` is to give it a fake field key and override
`#field-<key>` — but that wraps it in field chrome (the
`.cn-settings-page__field` flex column with the help-text `<small>`
under it), which is wrong for a whole-section widget. There's no
section-level escape hatch.

### `CnVersionInfoCard` (existing widget)

Wraps `CnSettingsSection` itself. Props:
`title`, `description`, `docUrl`, `cardTitle`, `appName` (required),
`appVersion` (required), `configuredVersion`, `isUpToDate`,
`showUpdateButton`, `updating`, `additionalItems`, `loading`, `labels`.
Emits `@update`. Slots: `#actions`, `#additional-items`, `#footer`,
`#extra-cards`.

Fully prop-driven for the data path; the only thing the consumer
*must* wire up is the `@update` handler (calling the app's update
endpoint). That handler is consumer-specific so it can't live in the
manifest — it's a known custom-fallback point.

### `CnRegisterMapping` (existing widget)

Also wraps `CnSettingsSection`. Props: `name`, `description`,
`docUrl`, `groups` (required, validated non-empty), `configuration`,
`showSaveButton`, `saving`, `showReimportButton`, `reimporting`,
`saveButtonText`, `reimportButtonText`, `autoMatch`, `labels`. Emits
`@update:configuration`, `@save`, `@reimport`. Slots: `#actions`,
`#group-header`, `#footer`.

Fetches registers/schemas itself from `/apps/openregister/api/registers`.
Two consumer-required wirings: `@save` (persist mapping into IAppConfig)
and `@reimport` (kick off the app's reimport endpoint). Same shape as
the version-info card — fully data-driven for display, but mutation
side-effects need consumer code.

### decidesk's `SettingsView.vue` (the consumer this unblocks)

Today's structure (top to bottom):

1. `CnVersionInfoCard` — Decidesk app version + a `#footer` slot with a
   support contact paragraph.
2. `CnRegisterMapping` — gated on `isAdmin`, wires `@save` →
   `settingsStore.saveSettings(config)` and `@reimport` → fetch the
   `/apps/decidesk/api/settings/load` endpoint.
3. `CnSettingsSection` — admin-only, wraps a single `NcButton` for
   re-import (redundant with the CnRegisterMapping reimport button —
   a cleanup opportunity but out of scope here).
4. `CnSettingsSection` — admin-only, ORI endpoint URL field + save
   button; binds `oriEndpoint` to the `ori_endpoint` IAppConfig key.
5. `CnSettingsSection` — admin-only, a single email-voting checkbox;
   binds `emailVotingEnabled` to the `email_voting_enabled` IAppConfig
   key.

Sections 4 and 5 are bare flat fields (one URL string, one boolean) —
exactly what `fields[]` was designed for. Section 3 is one button that
duplicates the reimport handler in section 2; it can fold into the
`@reimport` slot of section 2 or be dropped.

That makes decidesk's settings page **fits cleanly into a 3-section
manifest**: one `widgets: [{ type: 'version-info' }]` section, one
`widgets: [{ type: 'register-mapping' }]` section, one `fields[]`
section with the two flat IAppConfig keys.

## API design

### Choice: Option A (per-section `body` shape selector)

Picked Option A from the prompt. Rationale:

- decidesk's actual SettingsView puts version-info and register-mapping
  in their own sections — the natural fit is "one widget per section"
  / "one component per section," not "a widget alongside flat fields."
- Option B (field-level `type: 'component'` and `type: 'widget'`)
  would force CnVersionInfoCard's giant prop set into the same shape
  as a string field. The cardinality is wrong: fields are properties
  of a form; widgets ARE the form for a section.
- Option A keeps the section-as-card mental model the rest of the
  manifest has (page → sections → bodies). Future page types
  (`logs`, `dashboard`) already use that shape: a section / widget /
  card chunks the page.
- Option A composes with the parallel `manifest-detail-sidebar-config`
  change (which uses the same `widgets[].type` registry pattern on
  detail-page sidebar tabs), so consumers learn one widget-resolution
  rule that works across two surfaces.

### Section shape

```ts
type SettingsSection = {
  title: string                  // i18n key
  description?: string
  icon?: string
  collapsible?: boolean
  docUrl?: string

  // Exactly one of these three keys must be present:
  fields?: Array<Field>          // bare flat fields (today)
  component?: string             // single registry-resolved component
  widgets?: Array<WidgetRef>     // ordered list of widgets

  // Companion fields:
  props?: object                 // forwarded as v-bind to the resolved
                                 // component when `component` is set
}

type WidgetRef = {
  type: string                   // 'version-info' | 'register-mapping'
                                 // | <registry-name>
  props?: object                 // forwarded as v-bind to the widget
  on?: Record<string, string>    // optional event-name -> consumer
                                 // event-bus key (deferred to a
                                 // follow-up if a consumer asks; v1
                                 // emits widget events through
                                 // CnSettingsPage's @widget-event)
}
```

The validator enforces "exactly one body" — sections declaring two of
the three are rejected with a clear path: `pages[N].config.sections[K]:
must declare exactly one of fields | component | widgets`.

### Built-in widget registry

```js
const BUILTIN_SETTINGS_WIDGETS = {
  'version-info': () => import('../CnVersionInfoCard/CnVersionInfoCard.vue'),
  'register-mapping': () => import('../CnRegisterMapping/CnRegisterMapping.vue'),
}
```

Lookup order in `CnSettingsPage`:

1. Look up `widget.type` in `BUILTIN_SETTINGS_WIDGETS`.
2. If miss, look up `widget.type` in `cnCustomComponents` injected
   from CnAppRoot (or the explicit `customComponents` prop on
   CnSettingsPage).
3. If still a miss, log a `console.warn` and skip rendering that
   widget — same failure mode CnPageRenderer uses for unknown page
   types. The page keeps rendering its other sections / widgets.

Built-ins win on collision so consumers can't accidentally shadow
`version-info` with their own component (a documented constraint —
reserved widget-type names are listed in the docs). If they really
need to shadow, a follow-up change can introduce
`pageTypes`-style override semantics for built-in widgets; today
they're closed.

### How widgets get their event handlers

Both `CnVersionInfoCard` and `CnRegisterMapping` emit events
(`@update`, `@save`, `@reimport`, `@update:configuration`). The
manifest can't declare a JS function, so the consumer wires those
through one of:

1. **CnSettingsPage forwards every widget event** as a single
   `@widget-event` event on itself, with payload
   `{ widgetType, widgetIndex, sectionIndex, name, args }`. Consumers
   listen once at the page level and dispatch by `widgetType` /
   `name`. This is the v1 wiring point — it's the documented
   custom-fallback for widget-event handling.
2. (Future) A `widgets[].on` map of `{ eventName: storeMethodName }`
   that resolves against a consumer-provided method registry. Deferred
   until a third consumer surfaces a need; v1 ships option 1 only.

### Composition with `headerComponent` / `actionsComponent` / `slots`

Unchanged from the current `CnSettingsPage`. The section-body extension
is orthogonal to page-level overrides. The new `widgets[]` / `component`
keys live INSIDE a section; the existing page-level slot map sits
ABOVE the section list.

## Decidesk migration recipe

The JSON below is what decidesk's `app-settings` page entry can become
after this change ships. Drop it into decidesk's manifest and the
existing `SettingsView.vue` can be retired (replaced by an
`@widget-event` handler in the consumer code that dispatches to the
existing settings-store methods).

```jsonc
{
  "id": "app-settings",
  "route": "/settings",
  "type": "settings",
  "title": "decidesk.settings.title",
  "config": {
    "saveEndpoint": "/index.php/apps/decidesk/api/settings",
    "sections": [
      {
        "title": "decidesk.settings.section.version",
        "widgets": [
          {
            "type": "version-info",
            "props": {
              "appName": "Decidesk",
              "showUpdateButton": true,
              "isUpToDate": true,
              "title": "decidesk.settings.versionInformation",
              "description": "decidesk.settings.versionInformationDescription"
            }
          }
        ]
      },
      {
        "title": "decidesk.settings.section.registers",
        "widgets": [
          {
            "type": "register-mapping",
            "props": {
              "name": "decidesk.settings.registerConfiguration",
              "description": "decidesk.settings.registerConfigurationDescription",
              "showReimportButton": true,
              "groups": [
                {
                  "name": "Decidesk",
                  "types": [
                    { "slug": "governance-body", "label": "decidesk.types.governanceBodies" },
                    { "slug": "meeting", "label": "decidesk.types.meetings" },
                    { "slug": "participant", "label": "decidesk.types.participants" },
                    { "slug": "agenda-item", "label": "decidesk.types.agendaItems" },
                    { "slug": "motion", "label": "decidesk.types.motions" },
                    { "slug": "amendment", "label": "decidesk.types.amendments" },
                    { "slug": "voting-round", "label": "decidesk.types.votingRounds" },
                    { "slug": "vote", "label": "decidesk.types.votes" },
                    { "slug": "decision", "label": "decidesk.types.decisions" },
                    { "slug": "action-item", "label": "decidesk.types.actionItems" },
                    { "slug": "minutes", "label": "decidesk.types.minutes" },
                    { "slug": "digital-document", "label": "decidesk.types.digitalDocuments" },
                    { "slug": "monetary-amount", "label": "decidesk.types.monetaryAmounts" },
                    { "slug": "offer", "label": "decidesk.types.offers" },
                    { "slug": "order", "label": "decidesk.types.orders" },
                    { "slug": "product", "label": "decidesk.types.products" },
                    { "slug": "report", "label": "decidesk.types.reports" }
                  ]
                }
              ]
            }
          }
        ]
      },
      {
        "title": "decidesk.settings.section.advanced",
        "fields": [
          {
            "key": "ori_endpoint",
            "type": "string",
            "label": "decidesk.settings.oriEndpoint",
            "help": "decidesk.settings.oriEndpointHelp"
          },
          {
            "key": "email_voting_enabled",
            "type": "boolean",
            "label": "decidesk.settings.emailVotingEnabled",
            "help": "decidesk.settings.emailVotingEnabledHelp"
          }
        ]
      }
    ]
  }
}
```

The consumer wiring in `main.js` (or wherever CnAppRoot lives) is:

```vue
<CnAppRoot
  :manifest="manifest"
  :customComponents="customComponents"
  @widget-event="onSettingsWidgetEvent" />
```

```js
methods: {
  onSettingsWidgetEvent({ widgetType, name, args }) {
    if (widgetType === 'version-info' && name === 'update') {
      // run the update flow
    }
    if (widgetType === 'register-mapping' && name === 'save') {
      this.settingsStore.saveSettings(args[0])
    }
    if (widgetType === 'register-mapping' && name === 'reimport') {
      this.reimportRegister()
    }
  },
}
```

## Backwards compatibility

- `pages[].config.sections[]` with bare `fields[]` keeps working —
  `fields` remains the default body kind. Every existing test in
  `CnSettingsPage.spec.js` continues to pass without modification.
- The schema's top-level `version` does NOT bump (still `1.1.0`). This
  is a description-only enrichment; v1.1 manifests are forwards-
  compatible because the new keys are additive on a section that
  previously only validated `fields`.
- Existing `#field-<key>` slot overrides keep working unchanged. They
  remain the right tool for "one custom input among flat fields"; the
  new shapes are for "the entire section is a custom widget."

## Design rule

When a consumer faces a settings section:

1. **Several flat IAppConfig keys?** → `fields: [...]`.
2. **One whole-section pre-built library widget (version, register-mapping)?**
   → `widgets: [{ type }]`.
3. **Several whole-section widgets stacked?** → `widgets: [...]` with
   multiple entries.
4. **One bespoke component the library doesn't know about?** →
   `component: <registry-name>` + `props`.
5. **Mostly flat fields with one bespoke input?** → `fields: [...]`
   plus a `#field-<key>` slot override on the page.

## Open design questions

1. **Should `widgets[]` allow per-widget `slots`?** — the underlying
   widgets have their own slots (`#footer`, `#extra-cards`, etc.). v1
   does not pipe these through; consumers needing them fall back to
   `component: <registry-name>` and write a wrapper. Promote to
   `widgets[].slots` in a follow-up if a third consumer asks.
2. **Should the validator know that `version-info` requires
   `props.appName` + `props.appVersion`?** — these are widget-level
   prop validation. The library's runtime Vue prop validator already
   warns; the manifest validator would duplicate that. v1 doesn't
   re-validate widget props.
3. **Do we ship `pageTypes`-style override hooks for the built-in
   widget map?** — no, see "Built-in widget registry" above. Built-ins
   are closed; consumers extend by registering their own widget type
   names through customComponents.
