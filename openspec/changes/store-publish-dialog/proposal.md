# Proposal: store-publish-dialog

## Why

Board PqStore draws Publiceren. CnStorePage could only link Publish to an app route, and no app has a publish page. OpenRegister now has a publish route, and pipelinq lists the local configuration a template may carry.

## What changes

- **`publishable` prop:** with it, CnStorePage's Publish opens `CnStorePublishDialog` instead of following `publishRoute`.
- **The dialog:**
  - pick a kind, then the local configuration of that kind (`GET /apps/<app>/api/store/publishable?kind=`);
  - give a title (the slug is made from it), a description, a version and a publisher;
  - publish with `POST /apps/<app>/api/store/publish` and `{item, objects}`.
- **Outcomes:** each outcome gets a message that names the remedy: not configured, unreachable, refused, too large, busy, not allowed. A publish emits `published`, and the page searches again.
