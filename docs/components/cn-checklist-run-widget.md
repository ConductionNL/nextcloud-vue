# CnChecklistRunWidget

A checklist answered a page of questions at a time: the question, its choices or a text field, an optional note, photos,
and Previous and Next. Registered under the `checklist-run` widget type, for detail pages and dashboards, and it works
inside a [device frame](./cn-device-frames-widget.md).

The board DqInspectie draws it in the middle phone frame: "Vraag 7 van 24 · Brandveiligheid versie 3", the question with
Ja / Nee / Niet van toepassing, a photo for the question and Vorige / Volgende. The questions, where the answers go and
the wording are all configuration; nothing in the widget knows what is being inspected.

## Content shape

```json
{
  "id": "checklist-run",
  "type": "checklist-run",
  "content": {
    "questions": { "register": "app", "schema": "question", "filter": { "checklist": "@object.checklist" }, "orderField": "position" },
    "fields": { "text": "text", "type": "type", "options": "options", "required": "required", "help": "help" },
    "answers": {
      "register": "app",
      "schema": "answer",
      "filter": { "run": "@objectId" },
      "questionField": "question",
      "valueField": "answer",
      "noteField": "note",
      "photosField": "photos",
      "create": { "run": "@objectId" }
    },
    "pageSize": 1,
    "caption": "{title} version {version}"
  }
}
```

| Key | Description |
|---|---|
| `questions` | `{ register, schema, filter?, orderField?, limit? }`: the question records. `filter` takes tokens (`@objectId`, `@object.<field>`, `@workspace.<key>`); nothing is read while one is unresolved. `orderField` sorts them, lowest first. |
| `fields` | Paths on a question record: `id` (default the record id), `text`, `type`, `options`, `required`, `help`. |
| `answers` | `{ register, schema, filter?, questionField, valueField, noteField?, photosField?, create? }`: one answer record per question. Answers already given fill the form. On Next or Previous the changed answers of the page are saved through the object API, so under the reader's own rights: an existing answer is updated, a new one is created with the `create` fields (tokens resolved). |
| `saveAction` | A manifest action that saves an answer instead, for an app that stores answers its own way. It is dispatched per changed answer with `{ questionId, value, note }` as its last argument. Photos are not offered then. |
| `finishAction` | A manifest action dispatched after the last page is saved. The widget also emits `finished`. |
| `pageSize` | Questions per page (default 1). |
| `allowNote` | Show a note field per question (default `true`). `noteLabel` names it. |
| `allowPhotos` | Offer photos for the first question of the page (default `true`, needs `answers.photosField`). A photo is uploaded through the answer object's own file upload and added to `photosField`; photos already there are kept. |
| `caption` | Text after the position ("Question 7 of 24 · …"), with `{field}` filled from the record. |
| `emptyText` | The text when the checklist has no questions. |

Question kinds: `yes_no` (Yes, No), `yes_no_na` (Yes, No, Not applicable), `choice` (the question's `options`, a list of
strings or `{ value, label }`), `number`, `photo` (answered with a photo) and `text`. `typeMap` maps the app's own type
values onto these kinds (an unknown type is a text field), and `choiceValues` (`{ yes, no, na }`) the values stored for
Yes, No and Not applicable. A required question keeps the page until it is answered. Question texts, labels and options
go through the app's translate.

## Questions and answers inside the open record

When a run keeps its questions and answers in its own record, read the questions with `questionsPath` and write the
answers with `answersPath` instead of `questions` and `answers`:

```json
{
  "type": "checklist-run",
  "content": {
    "questionsPath": "templateSnapshot.sections",
    "itemsKey": "items",
    "groupLabelField": "name",
    "orderField": "order",
    "fields": { "id": "id", "text": "label", "type": "responseType", "options": "choices", "required": "required", "help": "helpText" },
    "typeMap": { "yes_no_na": "yes_no_na", "text": "text", "getal": "number", "meerkeuze": "choice", "photo": "photo", "meting": "number" },
    "choiceValues": { "yes": "ja", "no": "nee", "na": "nvt" },
    "answersPath": "responses",
    "answerKey": "itemId",
    "answerFields": { "value": "value", "number": "numericValue", "choice": "choice", "note": "comment", "photos": "photos", "at": "respondedAt" },
    "recordPhotosField": "photos",
    "caption": "{templateSnapshot.name} versie {templateVersion}"
  }
}
```

| Key | Description |
|---|---|
| `questionsPath` | Path on the open record of the questions, or of groups of them. |
| `itemsKey` | With groups: the key of each group's questions. The group's `groupLabelField` (default `name`) is shown above its questions. |
| `orderField` | Sorts the groups and the questions, lowest first (default `order`). |
| `answersPath` | A property of the open record holding one answer entry per question, keyed by `answerKey` (default `questionId`). The changed answers of a page are written into it with one update of the record through the object API, under the reader's own rights. |
| `answerFields` | Where an entry keeps its parts: `value` (yes/no and text), `number`, `choice`, `note`, `photos`, and `at` (set to the time of the answer when given). |
| `recordPhotosField` | The record's own photo list. A photo is uploaded to the record's files and added there, and its reference (`photoRefField`, default `id`) goes into the answer's `photos`. |
| `record` | `{ register, schema }` of the open record, when the page does not hand them in; with `filter` (and `sort`) it picks the record, see below. |

## A photo a question asks for

`fields.photoRequired` names a question's photo rule, and `photoRequiredValues` maps its stored values onto `never`,
`always` or `{ "whenAnswer": <value> }` (a photo is needed when the answer is that value). `true` / `false` and
`always` / `never` map by themselves. With a rule, every question of the page that is not `never` gets its own photo
control, and Next holds the page, saying "This answer needs a photo", until the photo is attached:

```json
{
  "fields": { "photoRequired": "photoRequired" },
  "photoRequiredValues": { "nooit": "never", "altijd": "always", "if_no": { "whenAnswer": "nee" } }
}
```

## Picking the record on a page without one

A dashboard (a device frame, say) hands the widget no record. `record` then picks it by filter, under the reader's own
rights: `{ register, schema, filter, sort }` reads the first match (`sort: { field, dir }`, newest first by default),
and the widget works on that record as on a bound one. With no match it shows `emptyText`; while a filter token is
unresolved it reads nothing.

```json
{ "record": { "register": "app", "schema": "run", "filter": { "inspector": "@me", "status": "in_execution" }, "sort": { "field": "startedAt", "dir": "desc" } } }
```

## Keyboard and screen readers

Each question is a fieldset whose legend is the question; the choices are native radio buttons, so the arrow keys move
between them. A required question says so to a screen reader. The photo control is a native file input that opens the
camera on a phone. On a new page focus moves to the position line ("Question 8 of 24") and a polite live region reads
it. Progress is a progress bar of the questions answered.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | `Object` | `{}` | The configuration above. |
| `objectId` | `String\|Number` | `''` | The bound record's id, for `@objectId` (handed in by the page host). |
| `objectData` | `Object` | `null` | The bound record, for `@object.<field>`, the caption, `questionsPath` and `answersPath`. |
| `register` | `String\|Object` | `''` | The bound record's register, for writing `answersPath` (handed in by the page host; `content.record` wins). |
| `schema` | `String\|Object` | `''` | The bound record's schema, for writing `answersPath`. |

## Events

| Event | Payload | Description |
|---|---|---|
| `finished` | `{ answered, total }` | The last page was saved. |
