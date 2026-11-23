# CnNotepadWidget

A personal notepad on the dashboard, typed into in place. The `notepad` widget type is user-addable, so a reader can put one on their own dashboard without naming a register or a schema.

Part of the dashboard widget library. Registered with the dashboard widget registry as `notepad`. See [the widget library overview](./cn-widget-grid.md).

## How it behaves

- The card is editable in view mode. Click in it and type; no edit mode is needed.
- The text is saved 800 ms after the last keystroke and on blur. A "Saved" message confirms a successful write. A failed write keeps the text in the card and says it was not saved; the next keystroke tries again.
- When the card is not focused, the note renders as markdown (a list stays a list). Click it, or press Enter on it, to edit.
- The note belongs to the reader. It is stored in their user preferences under `notepad.<dashboard id>.<widget id>` as `{ text, updatedAt }`, never in the dashboard layout. Two readers of the same dashboard each see only their own note in the same card, and typing never rewrites the layout.
- On focus the card reads the stored value again. A newer value (the same person typed in another tab) replaces the card's text before editing, unless the card holds unsaved changes of its own. Last write wins within one focus; nothing is merged.

The dashboard id comes from `CnDashboardPage` (the injected `cnDashboardPageId`); the preferences come from `CnAppRoot` (the injected `cnUserPreferences`). Outside those, set `content.dashboardId` and `content.appId`.

## Accessibility

The textarea is labelled by the card title (`content.title`, "Notepad" when empty). The Saved and not-saved message sits in a polite live region.

## Reference

### Props

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `widgetId` | `string` or `number` | | `'notepad'` | The widget's stable id within its dashboard; part of the storage key. Dashboard widgets receive it from the grid. |
| `content` | `{title?: string, height?: string or number, dashboardId?: string, appId?: string}` | | `\{\}` | Placement content: `title` labels the textarea, `height` (a CSS length or pixels) sets its minimum height, `dashboardId` overrides the dashboard id in the storage key, `appId` names the app whose preferences hold the note when no `CnAppRoot` provides one. |
