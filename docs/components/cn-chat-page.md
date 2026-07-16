---
sidebar_position: 14
---

# CnChatPage

A conversation / messaging page. v1 implementation embeds the conversation via an `<iframe>` to `conversationSource` (typically an NC Talk embeddable URL). v2 will introduce a native thread renderer.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "chat"`. Honours `headerComponent`, `actionsComponent`, and the generic `slots` map. The fully-replaceable `#conversation` slot is the v2 / native-renderer extension point.

**Wraps**: `CnPageHeader`, `NcEmptyContent`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Conversation'` | Page title |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `false` | Whether to render the inline `CnPageHeader` |
| `icon` | String | `''` | MDI icon name |
| `conversationSource` | String | `''` | URL of the embedded conversation (NC Talk embed by default) |
| `postUrl` | String | `''` | Custom thread-API endpoint, used by consumers building their own chat UI via the `#conversation` slot |
| `schema` | String | `''` | OpenRegister schema slug for an OR-backed conversation. Reserved for v2 native rendering. |
| `sandbox` | String | `'allow-scripts allow-same-origin allow-forms allow-popups'` | `sandbox` attribute on the iframe |
| `emptyText` | String | `'No conversation selected'` | Text shown when no conversation source is set |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions area (filled by `pages[].actionsComponent`) |
| `conversation` | `{ conversationSource, postUrl, schema }` | Replaces the iframe entirely — the v2 / native-renderer extension point |
| `empty` | — | Replaces the empty-state when no conversation source is set |

## Manifest configuration

```jsonc
{
  "id": "chat-thread",
  "route": "/chat/:id",
  "type": "chat",
  "title": "myapp.chat.title",
  "config": {
    "conversationSource": "/index.php/apps/spreed/embed/abc123"
    // OR a custom thread API for a self-built chat UI:
    // "postUrl": "/index.php/apps/myapp/api/threads/abc123"
  }
}
```

## Custom-fallback notes

- **v1 is iframe-only.** The component does NOT yet ship a native thread renderer, message composer, typing indicator, or attachment uploader. Apps that need any of these MUST fill the `#conversation` slot with their own component. The slot scope (`{ conversationSource, postUrl, schema }`) gives the consumer everything the manifest supplied without re-reading the page config.
- **No event emission in v1** (`@send`, `@receive`, `@typing` are reserved for v2). Consumers needing those today fill `#conversation`.
- **Sandbox defaults to `allow-scripts allow-same-origin allow-forms allow-popups`** — sufficient for NC Talk embeds; tighten or relax via the manifest as needed.
- **No WebSocket support** — the iframe inherits the embedded view's transport. v2's native renderer will adopt polling first, WebSockets later (per design.md Q3).
- **`postUrl` alone (no `conversationSource`) renders the empty-state** in v1; the consumer is expected to fill `#conversation` to make use of it.
