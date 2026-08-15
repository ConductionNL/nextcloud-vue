# CnAiHistoryList

Searchable conversation list with inline rename/describe, used by the AI Chat
Companion's History tab.

This is a plain component, not a dialog. It is embedded directly in
`CnAiChatPanel`'s sidebar tab, and `CnAiHistoryDialog` wraps this same component
in an `NcDialog` for consumers that still want the overlay. ADR-004 constrains
where modal *markup* lives — it does not require History to be presented as a
modal — so the shared list lives here and the dialog stays a thin wrapper over
it.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `conversations` | `Array` | `[]` | Conversations to list. |
| `activeConversationUuid` | `string` | `null` | The currently-open conversation, highlighted in the list. |
| `loading` | `boolean` | `false` | Whether conversations are still being fetched. |
| `fetchError` | `boolean` | `false` | Whether the fetch failed. Shows an inline notice rather than an empty list. |

## Events

| Event | Payload | Description |
|---|---|---|
| `select` | `string` — the conversation uuid | A conversation was chosen; the parent loads it. |
| `renamed` | `object` — the updated conversation | A conversation's name/description was saved, so the parent can refresh its copy. |

## Behaviour

- **Search matches on name AND description**, which is only useful because
  conversations can be renamed — hermiq's `PATCH /api/conversations/{uuid}`
  accepts `title` plus `metadata`, and the description is stored at
  `metadata.description` (there is no dedicated column).
- Renaming matters more than it looks: conversations are created titled
  "New conversation", so an unnamed history is a wall of identical rows.

## Accessibility

- The search field is labelled.
- Rename controls are keyboard reachable, and each row's action carries an
  `aria-label` naming the conversation it acts on.
