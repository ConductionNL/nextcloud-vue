# Design: screens-one-scroller-parity

## Which element scrolls

`NcContent` lays the navigation, `NcAppContent` and `NcAppSidebar` side by
side at the window's height; `NcAppContent` is `overflow: auto` and its end
edge is the window edge (or the sidebar's start edge while the sidebar is
open). Making it the only scroller of the page puts the one scrollbar where
Ruben asked for it, with no change to `NcContent` and none to the document.

Index and settings pages already let `NcAppContent` scroll. `CnDashboardPage`
did not: under the board look its `height: auto; overflow-y: visible` hands
the scrolling back. Nothing in the dashboard reads its own scroll position.

## Full width

The 1240px cap came from the boards, which are drawn 1440px wide, where the
content is 1176px and the cap never engages. On a wider window it only left
dead space. `--cn-board-content-max-width` stays as the hook, now `none`; an
app that wants a cap can still set it on its root. The pixel diff at 1440 is
unchanged.

## The navigation

The region above the list keeps its content's height (`overflow: visible`,
`flex-shrink: 0`), so the primary action is never clipped and there is no empty
track. The list keeps `overflow-y: auto` so a long menu stays reachable, but
draws no bar (`scrollbar-width: none`, and `::-webkit-scrollbar` for older
WebKit). Keyboard focus scrolls a focused entry into view, so every entry
stays reachable without a pointer.
