# Index row actions can open a modal on the row

## Why

A list over an app endpoint (deleted records, a mail intake log, a substitution
list) acts on one row behind a confirm: restore, destroy, revoke, file on a case.
`CnIndexPage` row actions of `type: "open-modal"` only warned and emitted
`@action`, so each such list stayed a hand-written page.

## What changes

- A row action of `type: "open-modal"` opens its `target` through the app root's
  `cnOpenModal`, with the row as `object` and its key as `objectId` (the action's
  own `props` win).
- An entity-sourced list reads its rows again on `cn:page:refresh`, which
  CnActionDialog and CnAssignDialog signal after they act. With CnActionDialog's
  `confirm.request` this gives a row a confirmed POST that shows the server's
  refusal sentence.
