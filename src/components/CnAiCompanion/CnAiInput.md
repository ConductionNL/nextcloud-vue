# CnAiInput

Multi-line textarea + send button + file-attach control for the AI Chat
Companion input region.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disables the textarea, send button, and attach button (e.g. during streaming). Shows `NcLoadingIcon` on the send button. |
| `chatAppId` | `string` | `'hermiq'` | Backend app id the attach button uploads files to (`POST /index.php/apps/{chatAppId}/api/chat/attachments`). See `composables/aiChatConfig.js`. |
| `speechInputEngine` | `string` | `'auto'` | Which engine may transcribe: `auto`, `browser`, `local`, `off`. From the agent's `voiceInputEngine`. |
| `localSpeechAvailable` | `boolean` | `false` | Whether the backend's own speech service answered its probe. Passed down so one panel probes once. |
| `dictationSilenceTimeout` | `number` | `2500` | Pause in ms before the microphone is released. `0` keeps it open. |
| `conversationEnabled` | `boolean` | `false` | Whether the hands-free conversation control is offered beside the microphone. |

## Events

| Event | Payload | Description |
|---|---|---|
| `send` | `{ text: string, attachments: Array<{path: string, name: string}> }` | Emitted on Enter (no Shift) or a send-button click with the trimmed textarea content and any uploaded attachment refs. Attachments are cleared afterwards. |
| `dictation-complete` | `string` | The transcript, once the local engine has returned one. |
| `conversation-state` | `boolean` | A hands-free conversation started (`true`) or ended (`false`). |

## Speech

Two controls, because they are two different acts:

- **Microphone — dictation.** Your words land in the box. A pause of
  `dictationSilenceTimeout` releases the microphone and **does nothing else**;
  the text stays for you to read and send. Dictation never sends by itself.
- **Headset — conversation.** Offered only when `conversationEnabled`. A pause
  ends your turn and **sends it**. Pressing this control is how a user agrees to
  that.

The microphone icon states what IS: filled while recording, hollow while idle,
and a spinner while a recorded clip is being transcribed (the local engine has
a wait at the end that the browser engine does not). It never shows a
struck-through microphone while listening — that reads as muted, which is
precisely the bug this control shipped with.

### Two engines, and why the choice is not cosmetic

| Engine | Latency | Where the audio goes |
|---|---|---|
| `browser` | instant, with live partial text | Google's servers in Chrome, Apple's in Safari. Firefox has no speech recognition at all. |
| `local` | seconds — the clip is uploaded and transcribed | the instance's own speech service; nothing leaves it |

`auto` prefers the browser and uses the local engine where the browser has no
recognition API, which is how Firefox users get a microphone at all.

🔴 **`local` never falls back to `browser`.** An agent is set to `local` because
its subject matter must not reach a cloud service, so an unavailable local
engine disables the control and says why. The same applies to spoken replies.

### Conversation mode and the feedback loop

In conversation mode the microphone reopens only when the **panel** calls
`resumeConversation()`, which it does once the reply has finished being spoken.
Reopening on a timer instead would record the agent's reply through the
speakers, send it back as the user's next turn, and leave the agent talking to
itself hands-free.

## Attachments

Clicking the paperclip button opens a hidden native file input. The picked
file is uploaded immediately as `multipart/form-data` (field name `file`) to
`chatApiBase(chatAppId)/chat/attachments` via `@nextcloud/axios`:

- **200** — the response `{ path, name }` is added as a removable chip above
  the textarea.
- **400** — the backend's `{ error }` message (oversized file, or a binary
  file that isn't text-decodable) is surfaced inline via `NcNoteCard`; the
  file is *not* silently dropped.

An attachment-only send (no text) is allowed — the send button is only
disabled when there is neither text nor a pending attachment.

## Keyboard Behaviour

- **Enter** — sends the message and clears the textarea
- **Shift+Enter** — inserts a newline without sending
- Send button disabled when the textarea contains only whitespace AND there
  are no attachments

## Accessibility

- `aria-label` on textarea: `t(appName, 'Message input')`
- `aria-label` on send button: `t(appName, 'Send message')`
- `aria-label` on attach button: `t(appName, 'Attach file')`
- `aria-label` on each chip's remove button: `t(appName, 'Remove attachment')`

## Usage

```vue
<CnAiInput :disabled="isStreaming" :chat-app-id="chatAppId" @send="onSend" />
```
