## Context

`CnAiCompanion` renders two things: `CnAiFloatingButton` (the hex) and
`CnAiChatPanel`. The panel was an `NcAppSidebar`; the hex was bound
`:visible="!isPanelOpen"`, so it vanished whenever the panel opened.

Both facts were fine while the companion only ever appeared inside a Conduction app,
which supplies the app-content layout a sidebar needs. Hermiq's `companion` bundle
changed that: the companion is now attached with `\OCP\Util::addInitScript` on every
page in the instance, most of which belong to somebody else.

## Goals / Non-Goals

**Goals:**
- Present correctly on a page whose layout we do not control.
- Keep the launcher present and make it the dismiss control.
- Make the window visibly belong to the hex that opened it.

**Non-Goals:**
- Draggable or resizable windows. A fixed anchor is predictable and needs no state.
- Multiple concurrent windows.
- Any change to the panel's props or events — consumers must upgrade without edits.

## Decisions

### D1 — A window, because a sidebar is the host application's furniture

`NcAppSidebar` positions itself against `#app-content` and its siblings. A third-party
editor has no such structure, so the component fell back to the left edge and rendered
its close control where nothing could reach it.

A window owns its own position, needs nothing from the page, and — the honest part —
**overlays rather than reflows** the host. A guest that reflows its host's layout is
making a claim on the page it has not earned.

Cost: we re-implement chrome NcAppSidebar gave for free (close control, Escape). That
is the trade, and it is worth it, because the free chrome only worked on pages that
were never the problem.

### D2 — The hex persists and toggles

`:visible="!isPanelOpen"` becomes an unconditional render, and the click handler
toggles rather than opens.

Three reasons, in order of weight:

1. **It is the one control we can guarantee.** The window's own close button lives in
   markup a hostile stylesheet could hide; the hex is fixed-position with
   `!important` and has survived every host we have put it on.
2. **A launcher that vanishes is a dead end** — the affordance you used to summon
   something should dismiss it.
3. It removes a state transition: no show/hide animation to coordinate with the
   window's own.

⚠️ The panel and the hex must therefore not overlap. The window anchors at 70px from
the same edge, clearing the 26×30 hex at its 24px inset.

### D3 — The window anchors to the hex's corner, not to a fixed corner

`CnAiCompanion` already takes a `position` prop for the hex. The window takes the same
value, so a companion configured `bottom-left` opens its window bottom-left.

An unconfigurable window corner would put the window across the page from the button
that opened it whenever a consumer moved the hex — the kind of detail that reads as a
bug rather than a limitation.

### D4 — Selectors are menus, because the window is 380px wide

The agent picker and the recent-sessions list were inline on the new-chat screen and
consumed most of the first screen before a message was visible. Both become
`NcActions` menus in the titlebar.

Icon-only, with `title` + `aria-label` carrying the label to hover and to screen
readers — a 380px titlebar cannot hold three labelled controls and an agent name.

### D5 — Halve the hex, and move both numbers together

52×60 → 26×30, glyph 26 → 13.

⚠️ **26:30 is √3:2, and that ratio is the only one at which the `clip-path` polygon
has six equal sides.** Changing one number "to make it a bit bigger" silently produces
a squashed hexagon. The numbers are a pair.

## Risks / Trade-offs

**We now own the window chrome**, including Escape-to-close and focus return, which
`NcAppSidebar` handled. Accepted under D1.

**A host page could still style our markup.** Mitigated the way the hex already is —
explicit properties with `!important` on the shell — and by D2, which keeps a control
outside the window entirely.

**Fixed size on small viewports.** `max-width: calc(100vw - 32px)` and
`max-height: calc(100vh - 120px)` keep it on screen; below that it is a genuinely small
surface, and a mobile layout is a separate piece of work rather than a clamp.
