# CnAiCompanion

Top-level mount for the AI Chat Companion widget. Auto-mounted inside `CnAppRoot` — consuming apps do not need to add it manually.

## Behaviour

On `created()`, issues `GET /index.php/apps/hermiq/api/chat/health` via axios with a 5-second timeout. When the response is non-2xx, the component renders nothing (no FAB, no panel) and emits no console output above `info` level. The probe result is cached for the component lifetime.

When the health probe succeeds:

- Renders `<CnAiFloatingButton />` anchored to the viewport.
- On FAB click, renders `<CnAiChatPanel />` with the full conversation surface.

The FAB and panel are both hidden when `useAiContext().pageKind === 'chat'` (i.e. when the user is already on OpenRegister's full-page chat view).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `'bottom-right'` \| `'bottom-left'` \| `'top-right'` \| `'top-left'` | `'bottom-right'` | Corner at which to anchor the FAB |
| `chatAppId` | `String` | `'hermiq'` | Backend app id the chat/agent endpoints resolve against; passed through to `useAiChatStream`. Pass `'openregister'` to ride OR's compat window (openregister#305). |
| `embedded` | `Boolean` | `false` | Render the chat as a panel of the page (no launcher, always open, no close button). It does not take the page's single floating-companion slot. `CnAiChatWidget` (`type: "ai-chat"`) uses it. |
| `titled` | `Boolean` | `false` | An embedded chat in a card that draws its title: the panel drops its own titlebar and emits its controls as `menu`. `CnAiChatWidget` sets it. |
| `note` | `String` | `''` | A line above the input, already translated. |
| `inputPlaceholder` | `String` | `''` | The input's placeholder, already translated. |
| `sendLabel` | `String` | `''` | A label on the send button, already translated. |

## Inject

| Key | Type | Description |
|---|---|---|
| `cnAiContext` | `CnAiContext` | Reactive context provided by `CnAppRoot`. Determines `isChatPage`. |

## Usage (auto-mounted)

```vue
<!-- CnAppRoot auto-mounts this — no manual wiring needed -->
<CnAppRoot :manifest="manifest" :translate="t" app-id="myapp">
  <router-view slot="default" />
</CnAppRoot>
```

## Standalone usage (rare)

```vue
<CnAiCompanion position="bottom-left" />
```
