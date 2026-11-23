# Proposal: detail-access-purpose

## Why

Ruben decided (20 October 2026): opening a case whose case type processes special categories of personal data asks the
reader why, and the purpose is recorded in the audit trail with the reader, the case and the time (DqSociaalDomein:
"Elke inzage wordt gelogd met het doel"). The ask belongs to the page, not to one app: any app with records that need
a stated purpose (health, criminal or other sensitive data) can use it.

## What changes

A detail page takes `accessPurpose: { when, options, url, title?, description? }`. When `when` (the `visibleWhen`
grammar, on the record and its `visibilityContext` records) holds, the page shows nothing of the record (no header,
body, side column or sidebar) and opens CnAccessPurposeDialog: the offered purposes plus "Other" with a written purpose.
The choice is POSTed to `url` (`{ purpose, note }`); the app records it and answers. On acceptance the page opens and
remembers the record for this browser session; a refusal or a cancel keeps it closed, with the reason or a button to
state a purpose. While the page cannot yet tell whether the record asks, it holds it back. Manifest schema 2.136.0.
