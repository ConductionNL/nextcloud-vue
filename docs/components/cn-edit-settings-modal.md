# CnEditSettingsModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the app's
**manifest-level settings** in the working manifest copy (ADR-041) — the app as a
whole rather than any single page. All edits mutate the passed `working` copy
**only**.

Opened by [CnOpenBuildEditButton](./cn-open-build-edit-button.md)'s "Edit
settings…" item. It edits:

- `version` — the manifest semver.
- `openbuildEditable` — whether the OpenBuild in-app edit button is offered on
  this app (a switch).
- `nav.includePersonalSettings` + `nav.settingsLabel` — whether the navigation
  shows a personal-settings entry and its label.
- `dependencies[]` — the Nextcloud app ids this app requires (a taggable
  `NcSelect`, with `inputLabel`).

## Import

```js
import { CnEditSettingsModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose top-level settings are edited in place. Never the base. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
