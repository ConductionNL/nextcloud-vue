# An api-call can open what the call answered

## Why
portaliq's submission rows get "Conversation in Talk": an app endpoint makes the room and answers its address. An
`api-call` only toasts and refreshes, so the reader is left without the room it just started.

## What changes
An `api-call` action takes `openResponse`: `true` (the answer's `url`), a field dot-path, or `{ field?, newTab? }`.
After a successful call the address opens, in a new tab with `newTab`. Only an http(s) URL or a server-relative path
opens. The manifest schema accepts the key on every action.
