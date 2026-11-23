# Design: dashboard-notepad-widget

Read at nextcloud-vue development `c8aa85863`.

## What is there

- Widgets register themselves into `dashboardWidgetRegistry`
  (`src/components/CnWidgetGrid/dashboardWidgetRegistry.js`) with a
  renderer, a form and `defaultContent`; `CnTextWidget/index.js` is the
  pattern. `listUserAddableWidgetTypes()` (`:114`) offers only types with
  `userAddable: true`.
- `CnTextWidget` renders `content.text` from the widget's placement. The
  text is in the layout, so changing it is a layout edit.
- `useUserPreferences` (`src/composables/useUserPreferences.js`) reads and
  writes one value per key through the app's preferences endpoint, per
  user. `CnDashboardPage` already stores a user's layout through it
  (`src/components/CnDashboardPage/CnDashboardPage.vue:704`).
- `CnMarkdownEditor` exists for markdown input.

## Decisions

### D1. The note is a preference, not widget content

Key `notepad.<dashboard id>.<widget id>`, value `{ text, updatedAt }`.
The layout holds only the widget's title and height. So typing never
rewrites the layout, a shared dashboard gives each reader their own
note, and removing the widget from a personal layout leaves the note
recoverable if they add it back with the same id.

Rejected: storing the text in `content.text` like `CnTextWidget`. Every
keystroke would be a layout write, and on a dashboard the admin owns the
reader could not write at all.

### D2. Typed in place, saved while typing

The card body is a textarea (plain text with markdown) that is editable
in view mode. It saves 800 ms after the last keystroke and on blur, and
shows "Saved" in the card footer when the write returns. A failed save
keeps the text in the textarea and says it was not saved; the next
keystroke tries again. When not focused, the markdown renders.

### D3. Two tabs, one note

On focus the card reads the stored value again. If it changed since the
card loaded (the same person typed in another tab), the card shows the
newer text rather than overwriting it. Last write wins inside one
focus; nothing is merged.

## Files

- `src/components/CnNotepadWidget/`: new renderer, form, `index.js` that
  registers `notepad` with `userAddable: true`.
- `src/components/CnWidgetGrid/registerDashboardWidgets.js`: import it.
- `src/schemas/app-manifest-v2.schema.json`: `notepad` in the widget type
  list.

## Accessibility

The textarea has the card title as its label. The Saved message is in a
polite live region.

## Theming

The card uses the wrapper's background. No new colours.
