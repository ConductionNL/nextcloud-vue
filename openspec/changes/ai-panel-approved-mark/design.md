# Design: ai-panel-approved-mark

Read on nextcloud-vue development `3eefb4f00` and thematiq development on
7 October 2026. Contract: thematiq `docs/reference/assistant-mark.md`.

## D1. One read per page, shared by every panel

The answer changes only when an admin changes a setting. A module-level
promise in `src/utils/assistantMark.js` holds the single request; every
panel instance awaits the same promise. A reload refetches. Alternative
rejected: `sessionStorage`. It would outlive an admin turning the mark off
for the rest of the browser session, and the contract says once per session
is enough, not that a stale answer is acceptable.

## D2. Installed check first

`isAppInstalled('thematiq')` (`src/utils/appInstalled.js`) answers from
`OC.appswebroots` without a request. When it is false the panel makes no
call. This avoids a 404 in the console of every app on an instance without
thematiq.

## D3. Silence on every failure

A non-2xx answer, a network error, malformed JSON, `enabled` not exactly
`true`, or an empty `label`: the footer is not rendered and nothing is logged
above `debug`. The mark is information, not a control (the contract says so),
so its absence must never look like an error to the user.

## D4. Contrast

The label uses `--color-main-text` on `--color-main-background` at the
panel's normal text size. Nextcloud guarantees at least 4.5:1 for that pair in
its light, dark and high-contrast themes. The library does not use
`--color-text-maxcontrast` for the label, because that variable is tuned for
3:1 secondary text on some themes. The logo is constrained to 24px height and
needs no contrast rule; its `alt` carries the meaning.

## D5. Where in the panel

A footer row below `cn-ai-chat-window__input`, inside the chat view and the
history view both, so the mark does not disappear when the user opens their
history. The row is `role="note"` so a screen reader announces it once as
supplementary information.

## D6. Logo address

`logo.url` is used as given when it is absolute, and passed through
`generateUrl` semantics only when it starts with `/apps/` and the instance
has a web root prefix. thematiq already returns either an https address or a
path on this server.

## Files

- `src/utils/assistantMark.js` (cached read)
- `src/components/CnAiCompanion/CnAiChatPanel.vue`, `CnAiChatPanel.md`
- `tests/components/CnAiChatPanel.spec.js`, `tests/utils/assistantMark.spec.js`
