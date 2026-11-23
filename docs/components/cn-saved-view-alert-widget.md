# CnSavedViewAlertWidget

The saved search an index page has applied, with its count alert (board DqZoekresultaten, "Opgeslagen zoekopdracht"):
its name, how many rows it holds now, and a switch that asks OpenRegister to tell the reader when the count reaches a
threshold.

Name it in an index page's `sidePanel` as `type: "saved-view-alert"`. It reads the page through the `cnIndexList`
CnIndexPage provides (the applied saved view and the list's total), so it shows nothing useful elsewhere. While no saved
view is applied it says how to get one.

The alert is the view's own `alert`, `{ operator: "gte", threshold, recipients: [<the reader>] }`, saved with a PATCH on
the view. OpenRegister evaluates it on its sweep and fires once when the count crosses the threshold, not on every sweep
the count stays above it. Switching it off clears the alert. Only the view's owner can change it.

```json
{ "id": "alert", "type": "saved-view-alert", "title": "Saved search", "content": { "noun": { "one": "case", "other": "cases" } } }
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `Object` | `{}` | `{ noun?: { one, other }, emptyText? }`. `noun` names what is counted ("9 zaken"); `emptyText` shows while no saved view is applied. Both are translated with the app's catalogue. |
