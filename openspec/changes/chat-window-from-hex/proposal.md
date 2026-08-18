---
kind: code
---

## Why

The AI companion's panel was an `NcAppSidebar`. A sidebar belongs to the application
that owns the page — and this companion is injected on **every** Nextcloud page,
including third-party office editors (`onlyoffice`, `eurooffice`, `richdocuments`)
that own their own chrome and provide none of the layout NcAppSidebar positions
against.

Observed on the Euro-Office editor: the panel docked itself to the **left** edge over
the editor's own rail, and rendered **without a usable close control**. The user's
report was exactly that — "the sidebar is suddenly on the left and has lost its close
button".

A second problem sits underneath the first. The launcher hex **disappears** while the
panel is open (`:visible="!isPanelOpen"`), so the thing you clicked to open the chat
is gone while the chat is open. There is no reason for a launcher to vanish, and its
absence removes the most obvious way to dismiss what it launched.

## What Changes

- **The panel becomes a window, not a sidebar.** Self-contained, fixed position,
  anchored to the corner the hex sits in, carrying its own close control and assuming
  nothing about the host page.
- **The hex STAYS while the chat is open, and toggles it.** Click to open, click again
  to close. It is a launcher and a dismiss affordance, and it is the one control
  guaranteed to be present regardless of what the host page does to our markup.
- **The window reads as belonging to the hex it came from** — same corner, offset
  clear of the button so both are visible and clickable at once.
- **The hex is half its former size** (52×60 → 26×30). It sits on top of someone
  else's application; it is a marker, not a control surface.
- **Chrome moves to a compact titlebar**: close, a sessions menu and an agent menu,
  icon-only with hover labels, and the **agent's** name and icon as the title.

## Why the title is the agent

"Hermiq" was the same string on every page for every agent. The one thing a user needs
to know before typing is which agent is about to answer — the same reason the agent
list is one click away in the titlebar rather than buried in settings.

## Capabilities

### New Capabilities
- `ai-chat-companion`: how the companion presents itself on a page it does not own —
  the launcher, the window it opens, and the relationship between them.

## Impact

- **Components**: `CnAiChatPanel` (sidebar → window), `CnAiFloatingButton` (size),
  `CnAiCompanion` (toggle + position wiring).
- **Consumers**: any app rendering `CnAppRoot` with `:aiCompanion="true"`, plus
  Hermiq's always-on `companion` bundle. No API change — the props and events are
  unchanged, so a consumer upgrades without edits.
- **Not in scope**: the composer's speech control and session-to-entity links, both
  specified in Hermiq's `session-entity-links`.
