# CnReferencePreview

Wrap a reference to another record and it shows what it points at, on focus and on hover, without leaving the page.

A handler reading a case note sees "ZAAK-2024-118" and has to follow it to read two fields. Following a reference and coming back is the expensive part, not the reading. This puts the summary where the reference is.

## Usage

```vue
<template>
  <p>
    Related to
    <CnReferencePreview
      recordId="case-118"
      label="ZAAK-2024-118"
      register="zaken"
      schema="case"
      :summaryFields="['title', 'status', 'assignee']"
      :fetchRecord="loadCase"
      @open-record="openCase" />
    , reported last week.
  </p>
</template>
```

Give it an `href` instead of listening for `open-record` and the reference stays a link a reader can open in a new tab.

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `recordId` | `String` | `''` | The referenced record's id. |
| `label` | `String` | `''` | What the reference reads as when no default slot is given. |
| `register` | `String` | `''` | The register the record lives in. Part of the cache key. |
| `schema` | `String` | `''` | The schema the record belongs to. Part of the cache key. |
| `readable` | `Boolean` | `true` | Whether this reader may read the record. `false` renders a plain reference with no card and no request. |
| `fetchRecord` | `Function` | `null` | Loads the record. Receives `{ recordId, register, schema }`, returns the record or `null`. |
| `objectStore` | `Object` | `null` | An object store to load through when no `fetchRecord` is given. |
| `summaryFields` | `Array` | `['title', 'status']` | The fields the card shows, in the order it shows them. A string is the key and the label; `{ key, label }` gives a different label. Dotted paths read into nested values. |
| `titleField` | `String` | `'title'` | Field the card's heading is read from. |
| `href` | `String` | `''` | Link the reference points at. With one the trigger is an anchor; without one it is a button that emits `open-record`. |
| `openDelay` | `Number` | `250` | Milliseconds before opening on hover, so a pointer crossing the reference does not open a card. |
| `closeDelay` | `Number` | `150` | Milliseconds before closing, so the pointer can travel onto the card. |

## Events

| Event | Payload | When |
|---|---|---|
| `open-record` | `String` | The reference was activated. Only when no `href` was given. |
| `loaded` | `Object \| null` | The record was loaded. `null` when it could not be read. |

## Slots

| Slot | Bindings | What it replaces |
|---|---|---|
| `default` | | The reference itself. Defaults to `label`. |
| `card` | `record`, `lines` | The summary body. `lines` is `summaryFields` resolved against the record. |

## What it is careful about

**Focus, not only hover.** A card that opens on hover alone does not exist for a keyboard or a touch screen. This opens on both, closes on escape and on blur, and never takes focus itself, so it cannot trap it.

**Forty references, twelve requests.** The in-flight promise is shared, not the settled value. A mouse sweep starts all forty before any of them answers, so caching the value alone would still make forty requests. The cache lives for the page.

**A reference you may not read stays a plain reference.** No card and no request. A preview that loaded and then showed an error would itself disclose that the record exists, so `readable: false` renders the reference as ordinary text.

**A glance, not a page.** Only the fields you name. A card that grows to the height of the viewport covers the thing being hovered.

## Declaring it in a manifest

Set `referencePreview: true` on the page and the renderer wires the previews for you:

```json
{ "id": "CaseDetail", "route": "/cases/:id", "type": "detail", "title": "Case", "referencePreview": true }
```

## Next

Put the case beside the list it came from with [`CnIndexPage`'s split view](./cn-index-page.md#split-view), so a reader never loses their place at all.
