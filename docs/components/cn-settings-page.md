---
sidebar_position: 13
---

# CnSettingsPage

A manifest-driven admin / config page. Renders `config.sections[]` as a stack of `CnSettingsCard` + `CnSettingsSection` blocks, with one form field per `section.fields[]` entry. Saves via `axios.put(saveEndpoint, formData)`.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "settings"`. Honours `headerComponent`, `actionsComponent`, and per-field `#field-<key>` slot overrides.

**Wraps**: `CnSettingsCard`, `CnSettingsSection`, `CnPageHeader`, `NcButton`, `NcCheckboxRadioSwitch`, `NcLoadingIcon`, `NcSelect`, `NcTextField`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Settings'` | Page title |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `false` | Whether to render the inline `CnPageHeader` |
| `icon` | String | `''` | MDI icon name |
| `sections` | Array | `[]` | Section definitions (see schema below) |
| `initialValues` | Object | `{}` | Initial values keyed by `field.key`. Pass the current `IAppConfig` snapshot here. |
| `saveEndpoint` | String | `''` | Endpoint that receives the PUT on save. When empty, no PUT is issued and `@save` fires with the form data so the consumer can persist it themselves. |
| `showSaveBar` | Boolean | `true` | Whether to render the built-in save / discard bar |
| `saveLabel` | String | `'Save'` | Save button label |
| `resetLabel` | String | `'Discard changes'` | Discard button label |
| `translate` | Function | `null` | Optional translation function applied to section titles + field labels |

## Section schema

```ts
type Section = {
  title: string             // i18n key (or literal label)
  description?: string      // optional, shown below the title
  icon?: string             // emoji or text rendered in the card title
  collapsible?: boolean
  docUrl?: string           // shows an info icon next to the title
  fields: Array<Field>
}

type Field = {
  key: string                                          // IAppConfig key
  label: string                                        // i18n key
  type: 'boolean' | 'number' | 'string' | 'password' | 'enum'
  options?: string[]                                   // required for type:'enum'
  help?: string                                        // micro-copy below the field
  default?: any                                        // pre-population value
}
```

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions area (filled by `pages[].actionsComponent`) |
| `field-<key>` | `{ field, value, onInput }` | Replaces the input for a specific field. Use this when the manifest's primitive types don't fit (e.g. JSON editor, color picker). |

## Events

| Event | Payload | When |
|-------|---------|------|
| `@save` | the form data object | After a successful save (or after `save()` when no `saveEndpoint` is set) |
| `@error` | the underlying error | When the PUT fails |
| `@input` | `{ key, value }` | On every field change |

## Manifest configuration

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

## Custom-fallback notes

- **Field types are intentionally narrow** (`boolean | number | string | password | enum`). Anything else (JSON, code editor, color picker, complex composites) requires a `#field-<key>` slot override on the consumer side. The library does NOT auto-pick a CodeMirror/CnJsonViewer for `type: 'json'` — there's no `'json'` type today, by design.
- **The `saveEndpoint` is consumer-supplied**. The library has no knowledge of the consuming app's id, so the documented "default `/index.php/apps/{appId}/api/settings`" is a convention the consumer fills in (often via a small wrapper around CnSettingsPage that injects the app id).
- **Field-level validation is not enforced FE-side**. The PUT body is sent as-is; the consumer's settings controller is the source of truth. This mirrors how Nextcloud's `IAppConfig` already works.
- **No inter-field dependencies / conditional visibility**. If you need "field X is only shown when field Y is true", use a `#field-<key>` slot to wrap a custom widget that reads `formData` from its parent.
