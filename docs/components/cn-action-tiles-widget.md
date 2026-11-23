# CnActionTilesWidget

A dashboard widget that draws a row of tiles, each an icon and a label. A click runs the tile's declared action with the page's context, such as the six steps of a call on the PqWerkplekKlant board, each opening its form for the client on the line.

Register it in a manifest as the `action-tiles` dashboard widget type:

```json
{
  "id": "call-steps",
  "type": "action-tiles",
  "content": {
    "tiles": [
      { "id": "note", "label": "Add a note", "icon": "NoteEditOutline", "action": { "type": "open-form", "schema": "note", "createDefaults": { "client": "@workspace.client" } } },
      { "id": "ticket", "label": "Open a ticket", "icon": "TicketOutline", "action": { "type": "open-form", "schema": "ticket" }, "visibleWhen": { "workspace": "client", "op": "notEmpty" } }
    ]
  }
}
```

`content.tiles` is a list of `{ id?, label, icon?, action, visibleWhen? }`:

- `label` goes through the host's translate.
- `action` has the `headerActions` shape. Its `@workspace.<key>`, `@objectId` and `@object.<field>` tokens are resolved at click time, and the page's action dispatcher runs it, so `open-form` and `open-modal` open their dialogs.
- A tile whose action still needs a token that has no value is drawn disabled.
- `visibleWhen`, a workspace condition, leaves a tile out while it does not hold.

A tile without a label or an action is left out.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget content: `{ tiles }`, as above. |
