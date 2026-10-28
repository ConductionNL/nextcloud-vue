# A dashboard description can come from an endpoint

## Why
Board PqMijnWerk heads My work with "Dinsdag 7 oktober 2026 · negen items liggen bij jou: zeven tickets, een lead en een opvolging; twee moeten vandaag beantwoord worden". The date already comes from `greeting: "date"`. The summary depends on the reader's work, so only the app can write it.

## What changes
`config.descriptionSource` is `{ url, path? }`. The text at `path` (default `text`) of the app endpoint's answer replaces `description` once it arrives. If the answer is unreadable, the page keeps `description`.
