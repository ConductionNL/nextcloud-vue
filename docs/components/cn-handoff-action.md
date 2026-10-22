# CnHandoffAction

Hands one record to another app. An endpoint says whether the record can go. The action sends it, and the widget shows the reference and the link that came back. Registered under the `handoff` widget type.

Use it for any "convert to", "send to" or "start in" step: a ticket that becomes a case, a contract that goes to invoicing, a client's hours that go to billing. The app owns the endpoints. The widget only reads them.

## Content shape

```json
{
  "type": "handoff",
  "title": "Case",
  "content": {
    "availability": { "url": "/apps/pipelinq/api/handoff/request/@objectId/availability" },
    "canPath": "canConvert",
    "donePath": "status",
    "doneValue": "converted",
    "referencePath": "caseReference",
    "copyReference": true,
    "action": { "url": "/apps/pipelinq/api/handoff/request/@objectId/convert-to-case", "label": "Convert to case" },
    "labels": {
      "done": "This request has been converted to a case.",
      "reference": "Case reference",
      "success": "Request converted to case.",
      "copied": "Case reference copied."
    },
    "errors": {
      "path": "status",
      "map": { "invalid-status": { "text": "Conversion is no longer available for this request.", "reload": true } },
      "default": "Could not convert this request to a case."
    }
  }
}
```

| Key | Meaning |
|-----|---------|
| `availability` | An endpoint source (`{ url, params?, responsePath? }`, the grammar of `useEndpointSource`). `@objectId` and `@object.<field>` resolve against the record. |
| `canPath` | Path, or list of paths, in the availability answer. The action shows only when every one is `true`. Default `available`. |
| `donePath` / `doneValue` | The record counts as handed over when the availability answers this value at this path. |
| `repeatable` | `true` keeps the button after a send (a contract is invoiced every period). The reference then comes only from the last send. |
| `referencePath` | Path of the reference in the send answer, else in the availability answer. |
| `linkPath` | Path of a link to the result. Only root-relative and http(s) links are drawn. |
| `fallbackLinkPath` | Path of a link shown as a button when the action is not offered ("Continue in Shillinq"). |
| `fields` | Values asked before sending: `[{ key, type: "date" \| "text", label, default?, required? }]`. `default` takes the filter tokens (`@monthStart`, `@monthEnd`, `@today`). The values are the body of the send. A required empty field blocks the button. |
| `action` | `{ url, method?, label, variant? }`. `method` is `POST` (default), `PUT` or `PATCH`. |
| `labels` | `done`, `reference`, `link`, `fallbackLink`, `success` (a toast), `copy`, `copied`, `copyFailed`. Each is translated through the host app. A label left out falls back to the library's own text (Send, Open, Reference, Copy). |
| `results` | `{ path, map, default? }`: the send answer's status names a message. A message is a text, `{ text, type?, textPath?, whenPath? }`, or a list of those. `type` is `success` (default), `warning` or `error`. `{field}` in the text is filled from the answer. `textPath` shows a text the answer carries instead. In a list, the first entry whose `whenPath` is truthy in the answer (or that has none) counts. |
| `errors` | `{ path, map, default }`: a refusal's status names a message, read like `results`. `reload: true` reads the availability again. Without a match the answer's `message` shows. |
| `copyReference` | `true` adds a Copy button next to the reference. |

Props: `content`, `objectId`, `objectData`. The widget also reads `cnObjectContext` when the page provides it.

The widget renders nothing when the action is not offered, nothing is done and there is no fallback link. It never shows a disabled button for an action the user cannot take.

## States

1. Loading: a spinner until the availability answers.
2. Offered: the fields (if any) and the action button.
3. Done: the done note, the reference with an optional Copy button, and the link.
4. Not offered: the fallback link, or nothing.
5. After a send: the outcome note; after a refusal, the error note.

## Next

Declare it on a detail page as a widget, or as a body section with `"type": "handoff"`. See [CnDetailPage](./cn-detail-page.md) for where widgets and body sections go.
