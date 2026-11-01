# CnRubricScorer

Scores a record against a rubric's criteria and levels. Registered under the `rubric-scorer` widget type.

Use it where a person picks one level per criterion and the record keeps the scores: a teacher marking a submission, a learner reviewing a classmate's work or their own, a tender evaluator scoring a bid, a manager filling in an appraisal.

Each criterion is a fieldset whose legend names it, with one radio per level and its points, so a screen reader announces the criterion with every choice. The total runs along. One save writes the scores, the total and an optional note to the scored record in ONE request; `submitAction` then runs a lifecycle transition on it. The server decides who may write: a refusal shows the server's own words and the choices stay.

## Content shape

```json
{
  "type": "rubric-scorer",
  "title": "Marking",
  "content": {
    "rubric": { "register": "school", "schema": "rubric", "id": "@object.rubricId" },
    "field": "rubricScores",
    "totalField": "proposedGrade",
    "note": { "field": "feedback", "label": "Feedback" },
    "submitAction": { "transition": "return", "label": "Return to the learner" },
    "requireAll": true,
    "readOnlyWhen": { "field": "lifecycle", "in": ["returned"] }
  }
}
```

| Key | Meaning |
|-----|---------|
| `rubric` | `{ register, schema, id }` reads the rubric object (page tokens resolve in `id`); `{ from }` reads it from a path of the page object. A rubric has `criteria: [{ criterionId, label, weight?, description?, levels: [{ levelId, label, points, description? }] }]`. |
| `field` | Where the scores are stored, as `[{ criterionId, levelId, points }]` (default `rubricScores`). |
| `totalField` | Where the total points are stored. Omitted stores none. |
| `note` | `{ field, label }`: a text written along (feedback, a reflection). |
| `submitAction` | `{ transition, label }`: its button saves, then runs the transition. |
| `requireAll` | The submit button waits until every criterion is scored and says how many are left. |
| `readOnly` / `readOnlyWhen` | Scoring is closed always, or while the condition holds for the scored record (`{ field, equals \| in \| … }`, as a form field's `visibleWhen`). |
| `createIfMissing` | `{ register, schema, filter, values }`: score the first record of that schema matching `filter`, or create one with `values` on the first save. |
| `saveLabel`, `emptyText` | Overrides for the save button and the text shown without a rubric. |

### Scoring another record

A self assessment is its own record, next to the submission it is about. On the submission's page:

```json
{
  "type": "rubric-scorer",
  "content": {
    "rubric": { "register": "school", "schema": "rubric", "id": "@object.rubricId" },
    "totalField": "totalScore",
    "note": { "field": "comments", "label": "Your reflection" },
    "submitAction": { "transition": "submit", "label": "Submit self assessment" },
    "requireAll": true,
    "createIfMissing": {
      "register": "school",
      "schema": "self-assessment",
      "filter": { "submissionId": "@objectId" },
      "values": { "submissionId": "@objectId", "assignmentId": "@object.assignmentId" }
    }
  }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget configuration above. |
| `objectData` | Object | `null` | The page object. |
| `objectId` | String \| Number | `''` | The page object's id. |
| `register` | String | `''` | The page object's register. |
| `schema` | String | `''` | The page object's schema. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | none | The scores were saved (and the transition ran, when asked). |
