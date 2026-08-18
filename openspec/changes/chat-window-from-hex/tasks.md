# Tasks

## 1. The panel becomes a window

- [ ] Replace `NcAppSidebar` with a self-contained fixed-position window in `CnAiChatPanel`
- [ ] Give it its own close control and Escape handling
- [ ] Anchor it to the corner passed down from `CnAiCompanion`
- [ ] Style: rounded corners, grey border, light-grey body, white titlebar

Acceptance criteria:
- Verify on a page the companion does not own (an office editor), not only inside a Conduction app — the sidebar form worked everywhere EXCEPT there, which is why the bug survived.
- The window must not depend on `#app-content` or any host layout node.
- ⚠️ We now own the chrome `NcAppSidebar` gave for free. Escape-to-close and focus return are ours to implement, not to assume.

## 2. The hex stays and toggles

- [ ] Render the launcher unconditionally — drop `:visible="!isPanelOpen"`
- [ ] Make its activation toggle the panel
- [ ] Offset the window clear of the launcher so both are visible and clickable

Acceptance criteria:
- With the chat open, the hex must still be present AND clickable, and clicking it must close the chat.
- Assert the two do not overlap: the hex is 26×30 at a 24px inset, so the window anchors at 70px from the same edge.
- The hex is the one control guaranteed to survive a hostile host stylesheet; the window's own close button is not.

## 3. Halve the launcher

- [ ] 52×60 → 26×30, glyph 26 → 13

Acceptance criteria:
- ⚠️ 26:30 is √3:2 and the ratio is load-bearing: the `clip-path` polygon has six equal sides ONLY at that ratio. Change both numbers together. A wrong ratio still renders — it just stops being the brand mark, so nothing fails and nobody notices.

## 4. Titlebar chrome

- [ ] Close, sessions menu, agent menu — icon-only, `title` + `aria-label`
- [ ] Title = selected agent's name + icon, with a non-empty fallback while loading or on error
- [ ] Move the agent picker and recent-session list into the menus

Acceptance criteria:
- Every control exposes an accessible label without rendering visible text.
- A newly opened chat shows the conversation area, not selectors — inline they filled the first screen before any message.
- An empty titlebar reads as a broken window: assert every branch (loaded / loading / failed) names something.

## 5. Verify

- [ ] `eslint` clean on the changed components
- [ ] `npm run build:validators && rollup -c` builds
- [ ] Load the companion on a third-party office editor page and confirm placement, toggle and no overlap

Acceptance criteria:
- ⚠️ The published dist consumers use is a RELEASE, not this source tree. A change verified only by building here is not verified for the fleet — say so plainly rather than implying it shipped.
- Props and events are unchanged, so a consumer must upgrade without edits. Assert the public surface did not move.
