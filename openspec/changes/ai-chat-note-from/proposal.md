# Proposal: ai-chat-note-from

## Why

Ruben, 6 Nov: the provider and place in DqZaakAssistent's note are read from Hermiq, never written as fixed text. A fixed sentence stays on screen when the deployment changes.

## What changes

- `ai-chat` widget `content.noteFrom`: `{ url, path?, match?, requires, text }`. The note reads the text filled from that row while every `requires` field is filled, and `note` otherwise.
