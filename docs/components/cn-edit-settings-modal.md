# CnEditSettingsModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the app's **settings
menu** in the working manifest copy (ADR-041) — the gear ⚙ foldout at the bottom
of `CnAppNav`, **not** the app's configuration. All edits mutate the passed
`working` copy **only**.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit
settings…" item. It edits:

- the **settings-section menu items** — the `menu[]` entries tagged
  `section: "settings"`, rendered with the same compact `CnMenuTreeNode` the main
  menu editor uses, scoped to the settings section (so the two editors don't show
  each other's items). "Add settings item" appends a new `section: "settings"`
  entry.
- the foldout's **personal-settings entry** — whether the auto "Personal
  settings" item shows (`nav.includePersonalSettings`) and the foldout label
  (`nav.settingsLabel`).

## Import

```js
import { CnEditSettingsModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose settings-section menu + nav settings are edited in place. Never the base. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
