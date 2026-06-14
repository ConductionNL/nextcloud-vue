# Design: Manifest page-type extensions

## Reuse analysis

- `CnDataTable` is the existing data-table primitive — `CnLogsPage`
  wraps it with log-specific columns.
- `CnSettingsCard` + `CnSettingsSection` already render config
  sections — `CnSettingsPage` is the manifest-friendly orchestrator.
- `CnPageRenderer`'s existing dispatcher pattern handles the new
  branches symmetrically.
- The schema validator (`validateManifest`) already has per-type
  config-shape hooks; we add four more.
- Apps' existing `IAppConfig`-bound settings controllers don't change
  — the new `CnSettingsPage` calls them through a `saveEndpoint`
  prop with the consumer's existing route.

## Type-selection guide (the design rule)

When a consumer faces a new page, the choice tree:

1. **Is it primarily a list of objects from a known register/schema?**
   → `index`.
2. **Is it the editor for a single object?** → `detail`.
3. **Is it a dashboard of widgets?** → `dashboard`.
4. **Is it a read-only audit-trail / activity-log view?** → `logs`.
5. **Is it admin / system config?** → `settings`.
6. **Is it a conversation thread?** → `chat`.
7. **Is it a file browser?** → `files`.
8. **None of the above** → `custom` + a registry component.

The criterion separating built-in vs custom: **does the page have a
declarative data shape?** Built-ins do; customs don't. The 4 new
types each have a small, well-defined config shape.

## Backward compatibility

- The schema bumps from 1.0 to 1.1; manifests declaring `$schema` URL
  for v1.0 keep working (the extension is additive — strict-mode
  validators reject UNKNOWN values, but every old value is still
  accepted).
- Existing `type:"custom"` pages keep working; consumers migrate at
  their own pace.
- The `pageTypes` extension prop on `CnAppRoot` keeps allowing apps
  to register additional types; they just have one more set of
  built-ins to fall back on.

## `config` shape per new type

```jsonc
// logs
{
  "register": "audit-trail-immutable",
  "schema": "audit-event"
  // OR a custom source:
  // "source": "/index.php/apps/{appId}/api/logs"
}

// settings
{
  "sections": [
    {
      "title": "i18n.settings.section.general",
      "fields": [
        { "key": "feature_x_enabled", "type": "boolean", "label": "i18n.settings.field.x" },
        { "key": "feature_y_threshold", "type": "number", "label": "i18n.settings.field.y" }
      ]
    }
  ],
  "saveEndpoint": "/index.php/apps/{appId}/api/settings"
}

// chat
{
  "conversationSource": "/index.php/apps/{appId}/api/conversations/{id}",
  // optional schema if conversation contents are OR-backed:
  "schema": "conversation"
}

// files
{
  "folder": "/{appId}/uploads",
  "allowedTypes": ["application/pdf", "image/*"]
}
```

## Component pseudocode

`CnLogsPage`:
- Resolves `config.register` + `config.schema` to `useObjectStore` if
  both set; falls back to `axios.get(config.source)` otherwise.
- Renders `CnDataTable` with columns `[timestamp, actor, action,
  target, details]` (configurable via `pages[].config.columns`).
- Honours filter URL params for time-range / actor / action.

`CnSettingsPage`:
- Loops `config.sections`, renders a `CnSettingsCard` per section,
  a `CnSettingsSection` per field group.
- Field types: `boolean | number | string | enum | password | json`.
- Saves via `axios.put(config.saveEndpoint, formData)`.

`CnChatPage`:
- Initial: `<iframe src="{config.conversationSource}" />` with NC Talk
  embed.
- Successor iteration: native thread renderer using the existing
  Conduction `useObjectStore` if `config.schema === 'conversation'`.

`CnFilesPage`:
- Wraps NC's file-picker / file-list components keyed by
  `config.folder`.
- Honours `config.allowedTypes` for filter chips.

## Open design questions

1. **Should `config.columns` for `logs` also accept the schema's
   property keys directly?** Probably yes — `config.columns: ['timestamp',
   'actor', 'reason']` is more declarative than column-definition objects.
   Defer until first consumer surfaces a need.
2. **Should `settings` validate fields against the schema before
   save?** No — settings are typically `IAppConfig` keys with their
   own validation server-side. The `CnSettingsPage` is a thin
   form-renderer; the controller validates.
3. **Does `chat` need WebSocket support for live updates?** Probably
   yes for v2; v1 ships polling.
4. **Should `files` integrate with the integration-registry's `files`
   provider?** Eventually yes — once `pluggable-integration-registry`
   ships in OR, `CnFilesPage` consumes the FE side of that registry.
   Defer the wiring; v1 wraps NC Files directly.
5. **Backwards-compat for the schema bump (1.0 → 1.1)**: should v1.0
   consumers fail validation when they encounter a v1.1 enum value?
   No — v1.0 manifests don't USE the new values, so they keep
   validating. The bump is for new manifests; old ones are unchanged.
