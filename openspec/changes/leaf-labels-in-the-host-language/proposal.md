# Proposal: leaf-labels-in-the-host-language

## Why

An integration leaf belongs to another app and speaks of its subject in general terms: decidiq's decisions card offers "Create proposal for this object". The page that mounts it knows what the object is. The board PqTicketBesluitvorming draws "Voorstel maken voor dit ticket" and an empty state titled "Geen besluit gekoppeld". A manifest `props` value reaches the leaf untranslated, and the leaf cannot translate the host app's words in its own catalogue, so a host had no way to give a leaf its wording.

## What changes

An `integration` widget may declare `labels`: an object of prop name to text. CnDetailWidgetHost translates each text through the host's translate (as it does the widget title) and hands it to the leaf as that prop, on the component path and on the mount path. A `props` entry of the same name wins. Leaves that do not declare the prop ignore it.

## Not changed

- A widget without `labels` renders as before.
- Tokens (`@object.…`) stay in `props`; `labels` are plain text.
