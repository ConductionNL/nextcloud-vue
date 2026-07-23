# CnAiAgentPicker

Agent dropdown shown on the AI Chat Companion's new-chat screen, so the user
chooses which agent to talk to before starting a conversation.

Presentational only — the parent (`CnAiChatPanel`) owns fetching the agent list
and the selection state.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `agents` | `Array` | `[]` | The selectable agents, as returned by `GET {chatApiBase}/agents`. |
| `value` | `string` | `null` | Selected agent uuid (`v-model`). |
| `loading` | `boolean` | `false` | Whether the agent list is still being fetched. Shows a loading state instead of an empty dropdown. |
| `fetchError` | `boolean` | `false` | Whether the agent fetch failed. Shows an inline notice rather than blanking the panel. |

## Events

| Event | Payload | Description |
|---|---|---|
| `input` | `string` — the selected agent uuid | Emitted on selection; enables `v-model`. |

## Behaviour

- Hermiq exposes no default-agent field, so the parent defaults the selection to
  the first accessible agent — the same semantics as the server's own
  `ChatStreamController::pickFallbackAgentForUser()`.
- Zero agents and a failed fetch both degrade gracefully: the panel stays
  usable and explains itself rather than rendering an empty control.

## Accessibility

- The dropdown carries an input label, so the control is announced rather than
  relying on adjacent text.
