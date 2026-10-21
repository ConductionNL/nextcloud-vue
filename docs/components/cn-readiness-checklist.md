---
sidebar_position: 12
---

# CnReadinessChecklist

A list of the things an instance needs, each with its state in words (Done, Still open, Unknown), an explanation, and a link to the screen that fixes it. Reported, never gated: nothing in the list blocks the app. Used for a first-run list and a prerequisites list on an admin page.

The state is always a word with a colour beside it, never a colour alone (WCAG 1.4.1).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | The items: `{ id, label, explanation?, met, fixHref?, failure?, group?, blocking? }`. `met` is `true`, `false` or `null` (unknown). With `fixHref` the label links to the screen that fixes it. `failure` says why an item could not be read |
| `source` | String | `''` | An app path to read the items from (`/apps/<app>/api/setup/status`), resolved with `generateUrl`. Read on mount and again when the window regains focus, so a fix made on another screen shows on return |
| `itemsPath` | String | `'items'` | Where the items sit in the answer (a bare array is taken as is) |
| `fields` | Object | `{}` | Item key to row key, over the defaults: `{ label: 'title', explanation: 'body', met: 'done', fixHref: 'screen' }` |
| `groups` | Array | `[]` | Headings for grouped items, in order: `[{ id, title }]`. Items without a known group come first, without a heading |
| `description` | String | `''` | A line above the list |
| `statusLabels` | Object | `{}` | The words per state: `{ met, unmet, unknown }` (e.g. present and missing) |
| `emptyText` | String | `''` | Said when there is nothing to check |
| `errorText` | String | `''` | Said when the source could not be read |
| `blockingText` | String | `''` | Said before the unmet items marked `blocking` ("Cannot run until this is installed:") |

Texts the page declares go through the host's `cnTranslate`.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `loaded` | the answer | The source answered; a host can read more from it (a note under the list) |

## Example

```vue
<CnReadinessChecklist
	source="/apps/myapp/api/setup/status"
	itemsPath="readiness"
	:fields="{ label: 'title', explanation: 'body', met: 'done', fixHref: 'screen' }" />
```
