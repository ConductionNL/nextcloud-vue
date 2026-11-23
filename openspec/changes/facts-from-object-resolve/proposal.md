# A from-object facts entry resolves from the page object

## Why

Board DqSociaalDomein "De melding" shows the case's Zaaktype on a card whose source is the family plan. The entry reads the case (`from: "object"`) with `resolve`, but the labels were looked up from the source record, so the case type stayed empty.

## What changes

- A `from: "object"` entry with `resolve` looks its reference up on the page's own object, also while the source finds nothing.
