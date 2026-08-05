---
sidebar_position: 13
---

# CnSettingsPage

A manifest-driven admin / config page. The page MAY declare EITHER a flat `config.sections[]` array OR a `config.tabs[]` array (one tab per logical group, each owning its own `sections[]`) — XOR, never both. Renders the active sections as a stack of `CnSettingsCard` blocks; in tabs mode a tab strip switches between groups.

Each section declares EXACTLY ONE of three body kinds:

1. `fields[]` — flat form fields (back-compat, default).
2. `component: <registry-name>` + optional `props` — mounts a customComponents-resolved component as the section body.
3. `widgets[]` — ordered list of widgets (built-in + customComponents).

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "settings"`. Honours `headerComponent`, `actionsComponent`, and per-field `#field-<key>` slot overrides.

**Wraps**: `CnSettingsCard`, `CnSettingsSection`, `CnPageHeader`, `NcButton`, `NcCheckboxRadioSwitch`, `NcLoadingIcon`, `NcSelect`, `NcTextField`. **Mounts (when sections request them)**: `CnVersionInfoCard`, `CnRegisterMapping`, plus consumer-provided components from the customComponents registry.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Settings'` | Page title |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `false` | Whether to render the inline `CnPageHeader` |
| `icon` | String | `''` | MDI icon name |
| `sections` | Array | `[]` | Section definitions for the flat shape (see schema below). Mutually exclusive with `tabs`. |
| `tabs` | Array | `[]` | Tab definitions for the orchestration shape: `[{ id, label, icon?, sections }]`. When non-empty, a tab strip renders above the section area. Mutually exclusive with `sections`. |
| `initialTab` | String | `''` | ID of the tab to activate on mount. When empty AND `tabs[]` is non-empty, the first tab is active. Unknown IDs fall back to the first tab. |
| `initialValues` | Object | `{}` | Initial values keyed by `field.key`. Pass the current `IAppConfig` snapshot here. |
| `saveEndpoint` | String | `''` | Endpoint that receives the PUT on save. When empty, no PUT is issued and `@save` fires with the form data so the consumer can persist it themselves. |
| `showSaveBar` | Boolean | `true` | Whether to render the built-in save / discard bar |
| `saveLabel` | String | `'Save'` | Save button label |
| `resetLabel` | String | `'Discard changes'` | Discard button label |
| `translate` | Function | `null` | Optional translation function applied to section titles + field labels |
| `customComponents` | Object | `null` | Explicit custom-component registry. Takes precedence over the injected `cnCustomComponents` (from CnAppRoot). Use this when mounting CnSettingsPage outside a CnAppRoot tree. |

## Section schema

```ts
type Section = {
  title: string                  // i18n key (or literal label)
  description?: string
  icon?: string
  collapsible?: boolean
  docUrl?: string

  // EXACTLY ONE of these three keys:
  fields?: Array<Field>          // bare flat-field body (back-compat default)
  component?: string             // single registry-resolved component as the section body
  widgets?: Array<WidgetRef>     // ordered list of widgets

  props?: object                 // forwarded as v-bind when `component` is set
}

type Field = {
  key: string                                          // IAppConfig key
  label: string                                        // i18n key
  type: 'boolean' | 'number' | 'string' | 'password' | 'enum'
  options?: string[]                                   // required for type:'enum'
  help?: string                                        // micro-copy below the field
  default?: any                                        // pre-population value
}

type WidgetRef = {
  type: string                   // 'version-info' | 'register-mapping' | 'component' | <registry-name>
  componentName?: string         // required when type === 'component' — registry name to resolve
  props?: object                 // v-bind to the resolved widget
}

type Tab = {
  id: string                     // unique within the page; addressable by `initialTab` and `@tab-change`
  label: string                  // i18n key — passed through `translate()` if wired
  icon?: string                  // optional MDI component name
  sections: Array<Section>       // same shape and rules as the flat sections[] case
}
```

## Built-in widget types

`CnSettingsPage` ships a small registry of built-in widgets that resolve before the customComponents registry. Reserved names (consumers cannot shadow these via customComponents):

| `widget.type` | Component | Common props |
|---------------|-----------|--------------|
| `version-info` | [`CnVersionInfoCard`](./cn-version-info-card.md) | `appName` (required), `appVersion` (required), `configuredVersion?`, `isUpToDate?`, `showUpdateButton?`, `additionalItems?`, `labels?` |
| `register-mapping` | [`CnRegisterMapping`](./cn-register-mapping.md) | `name`, `groups` (required, non-empty), `configuration?`, `showSaveButton?`, `showReimportButton?`, `autoMatch?` |
| `component` | (discriminator) | `componentName` (required, non-empty) — looks up the named entry in `customComponents`. `props` are forwarded as `v-bind` to the resolved component. The recommended way to host a consumer Vue component as a widget body. |

Consumer-provided widget types may also still be referenced via the legacy `widget.type === <registry-name>` fallback (kept for back-compat with `manifest-settings-rich-sections` consumers). Migrate to the explicit `{ type: "component", componentName }` shape — it makes the manifest self-describing and forward-safe against future built-in widget names. Unknown types are skipped with a `console.warn`; the rest of the page keeps rendering.

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions area (filled by `pages[].actionsComponent`) |
| `field-<key>` | `{ field, value, onInput }` | Replaces the input for a specific field within a `fields[]` section. Use this when the manifest's primitive types don't fit (e.g. JSON editor, color picker). Has no effect on `component` / `widgets[]` sections. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `@save` | the form data object | After a successful save (or after `save()` when no `saveEndpoint` is set) |
| `@error` | the underlying error | When the PUT fails |
| `@input` | `{ key, value }` | On every field change inside a `fields[]` section |
| `@widget-event` | `{ widgetType, widgetIndex, sectionIndex, name, args }` | Emitted whenever a widget mounted via `widgets[]` or `component` re-emits one of its own events. The manifest can't carry inline JS, so this is the documented event-wiring escape hatch — wire one handler at the CnAppRoot level and dispatch by `widgetType` / `name`. For `{ type: "component", componentName: "X" }` widgets, `widgetType` is the resolved `componentName`. |
| `@tab-change` | `{ tabId, tabIndex }` | Emitted when the user clicks a different tab button. Use this to persist the active tab into a preference store or URL hash. Only fires in tabs orchestration mode. |

## Manifest configuration

### Bare-fields section (back-compat)

```jsonc
{
  "id": "app-settings",
  "route": "/settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "sections": [
      {
        "title": "myapp.settings.general",
        "fields": [
          { "key": "feature_x_enabled", "type": "boolean", "label": "myapp.settings.feature_x" },
          { "key": "max_items", "type": "number", "label": "myapp.settings.max_items", "default": 50 }
        ]
      }
    ],
    "saveEndpoint": "/index.php/apps/myapp/api/settings"
  }
}
```

### Rich sections (built-in widgets + bespoke component)

```jsonc
{
  "id": "app-settings",
  "route": "/settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "saveEndpoint": "/index.php/apps/myapp/api/settings",
    "sections": [
      {
        "title": "myapp.settings.section.version",
        "widgets": [
          {
            "type": "version-info",
            "props": { "appName": "MyApp", "appVersion": "0.1.0", "showUpdateButton": true }
          }
        ]
      },
      {
        "title": "myapp.settings.section.registers",
        "widgets": [
          {
            "type": "register-mapping",
            "props": {
              "groups": [
                { "name": "Core", "types": [{ "slug": "thing", "label": "Thing" }] }
              ],
              "showReimportButton": true
            }
          }
        ]
      },
      {
        "title": "myapp.settings.section.advanced",
        "component": "MyAdvancedPanel",
        "props": { "foo": "bar" }
      },
      {
        "title": "myapp.settings.section.flags",
        "fields": [
          { "key": "feature_x_enabled", "type": "boolean", "label": "myapp.settings.feature_x" }
        ]
      }
    ]
  }
}
```

### Multi-tab admin (orchestration shape)

```jsonc
{
  "id": "Settings",
  "route": "/settings",
  "type": "settings",
  "title": "myapp.settings.title",
  "config": {
    "saveEndpoint": "/index.php/apps/myapp/api/settings",
    "tabs": [
      {
        "id": "general",
        "label": "myapp.settings.tab.general",
        "sections": [
          { "title": "myapp.settings.section.general", "fields": [
            { "key": "enabled", "type": "boolean", "label": "myapp.settings.enabled" }
          ] }
        ]
      },
      {
        "id": "about",
        "label": "myapp.settings.tab.about",
        "sections": [
          { "title": "myapp.settings.section.about", "widgets": [
            { "type": "version-info", "props": { "appName": "MyApp", "appVersion": "0.1.0" } }
          ] }
        ]
      },
      {
        "id": "workflow",
        "label": "myapp.settings.tab.workflow",
        "sections": [
          { "title": "myapp.settings.section.workflow", "widgets": [
            { "type": "component", "componentName": "WorkflowEditor", "props": { "schemaSlug": "workflow" } }
          ] }
        ]
      }
    ]
  }
}
```

The first tab is active by default. Override via the `initialTab` prop (e.g. from a preference store):

```vue
<CnAppRoot
  :manifest="manifest"
  :customComponents="customComponents"
  :pageTypeProps="{ settings: { initialTab: prefs.lastSettingsTab } }"
  @tab-change="onTabChange" />
```

### Wiring widget events

Widget events bubble through `@widget-event` on the page. The consumer wires a single handler at the CnAppRoot mount point:

```vue
<CnAppRoot
  :manifest="manifest"
  :customComponents="customComponents"
  @widget-event="onWidgetEvent" />
```

```js
methods: {
  onWidgetEvent({ widgetType, name, args }) {
    if (widgetType === 'version-info' && name === 'update') {
      this.runUpdate()
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

## When to use flat sections vs tabs

- **One logical group of 1–4 sections?** → flat `sections: [...]`.
- **Several logical groups (Account / Catalogue / Sync / Notifications / …)?** → `tabs: [{ id, label, sections }]`.

The two shapes are XOR — pick one per page. A page mixing them is rejected by the validator. If a consumer wants one general section + tabs for the rest, model it as a "General" tab containing the section.

## When to use which body kind

1. **Several flat IAppConfig keys?** → `fields: [...]`.
2. **One whole-section pre-built library widget (version, register-mapping)?** → `widgets: [{ type }]`.
3. **Several whole-section widgets stacked?** → `widgets: [...]` with multiple entries.
4. **One bespoke component the library doesn't know about?** → `component: <registry-name>` + `props` (whole-section body) OR `widgets: [{ type: "component", componentName: <registry-name>, props }]` (one of several widgets).
5. **Mostly flat fields with one bespoke input?** → `fields: [...]` plus a `#field-<key>` slot override.

## Custom-fallback notes

- **Field types are intentionally narrow** (`boolean | number | string | password | enum`). Anything else (JSON, code editor, color picker, complex composites) requires a `#field-<key>` slot override on the consumer side. The library does NOT auto-pick a CodeMirror/CnJsonViewer for `type: 'json'` — there's no `'json'` type today, by design.
- **Widget event handlers MUST be wired by the consumer** via `@widget-event`. The manifest can't carry inline JS, so the consumer dispatches on `widgetType` + `name`. Common widget events: `CnVersionInfoCard` emits `@update`; `CnRegisterMapping` emits `@save`, `@reimport`, `@update:configuration`.
- **The `saveEndpoint` is consumer-supplied**. The library has no knowledge of the consuming app's id, so the documented "default `/index.php/apps/{appId}/api/settings`" is a convention the consumer fills in (often via a small wrapper around CnSettingsPage that injects the app id).
- **Field-level validation is not enforced FE-side**. The PUT body is sent as-is; the consumer's settings controller is the source of truth. This mirrors how Nextcloud's `IAppConfig` already works.
- **No inter-field dependencies / conditional visibility**. If you need "field X is only shown when field Y is true", use a `#field-<key>` slot to wrap a custom widget that reads `formData` from its parent.
- **A section MUST declare exactly one body kind** (fields | component | widgets). The manifest validator rejects sections that mix two or more, or that declare none. Use multiple sections for stacked widget + flat-field layouts.
- **Built-in widget types are reserved**. Consumers cannot shadow `version-info` / `register-mapping` via customComponents — built-ins always win on collision. To replace one of these entirely, use the `component: <registry-name>` body kind instead.
- **Widget-internal slot overrides aren't piped through the manifest**. CnVersionInfoCard exposes `#footer`, `#extra-cards`, etc., but `widgets[]` doesn't yet carry per-widget slot maps. Consumers needing those slots should drop down to `component: <registry-name>` and write a tiny wrapper component that fills them.
- **Tabs are XOR with flat sections at the page level**. The validator rejects manifests that declare both `sections` and `tabs` on the same `type:"settings"` page. Use a single "General" tab containing your top-level section if you need a mix of flat content + tab-grouped content.
- **Tab IDs MUST be unique within a page**. The validator emits a duplicate-id error pointing at the second occurrence so you can fix the manifest fast.
- **Active-tab persistence is the consumer's responsibility**. The page emits `@tab-change` and accepts `initialTab` — wire those to your preference store or URL hash if you want the active tab to survive a reload. The manifest never carries user state.
- **`widget.type === "component"` is the recommended way to host consumer Vue components as widgets**. The legacy "fall back to customComponents on unknown `widget.type`" path still works (back-compat) but is JSDoc-deprecated; future built-in widget names risk silently shadowing consumer registry entries.
