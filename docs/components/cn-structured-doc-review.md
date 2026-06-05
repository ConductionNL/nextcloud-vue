---
sidebar_position: 30
---

# CnStructuredDocReview

Structured-document review surface with a syntax-highlighted body
(via [`CnJsonViewer`](./cn-json-viewer.md) supporting JSON / XML /
HTML / plain), a validation-issues panel, a status pill, and an
approve / reject decision row.

For "review an OSO dossier / SOAP envelope / DSIG payload and sign
off" flows where the reviewer sees the raw document, the
machine-detected issues, and the decision in a single screen. The
component owns the UI; consumers wire decision persistence in the
`@decision` handler.

## Try it

```vue
<CnStructuredDocReview
  title="OSO dossier 2026-Q1"
  description="Submitted by Cohort A coordinator"
  :content="dossierXml"
  language="xml"
  :issues="validationIssues"
  status="needs-review"
  @decision="onDecision" />
```

```js
const validationIssues = [
  { severity: 'warning', message: 'Missing optional /school/contact field', path: '/school/contact' },
  { severity: 'error',   message: 'Invalid date format on /period/start',    path: '/period/start' },
]

function onDecision({ verdict, comment }) {
  // verdict: 'approve' | 'reject'
  // comment: reviewer note (may be empty unless rejectRequiresComment)
}
```

## Approval gating

- **Approve** is disabled when any issue has `severity: 'error'` (configurable via consumer-side filtering before passing `issues[]`).
- **Reject** is disabled when `rejectRequiresComment` (default `true`) and the comment is blank.
- Both are disabled when the parent sets `loading: true` (during the API call).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Header title. |
| `description` | String | `''` | Description under the title. |
| `content` | Any | `''` | Document body. Forwarded to `CnJsonViewer`. |
| `language` | String | `'auto'` | Syntax-highlight language (`'json'`, `'xml'`, `'html'`, `'plain'`, `'auto'`). |
| `issues` | `Array<{severity?,message,path?}>` | `[]` | Validation issues. Recognised severities: `'error'`, `'warning'`, `'info'`. Missing severity defaults to `'error'`. |
| `status` | String | `'needs-review'` | Status pill value. Recognised: `valid`, `invalid`, `needs-review`, `approved`, `rejected`, `pending`; unknown values render as raw with `unknown` styling. |
| `statusLabels` | `Record<string,string>` | (built-in EN map) | Override per-status label. |
| `showDecision` | Boolean | `true` | Hide the decision row for read-only views. |
| `commentLabel` / `commentPlaceholder` | String | — | Comment textarea labels. |
| `approveLabel` / `rejectLabel` | String | `'Approve'` / `'Reject'` | Action labels. |
| `issuesTitle` | String | `'Validation issues'` | Issues-panel heading. |
| `rejectRequiresComment` | Boolean | `true` | Require non-empty comment to enable Reject. |
| `loading` | Boolean | `false` | Disable inputs + buttons mid-submit. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `decision` | `{verdict, comment}` | Approve / Reject clicked. |

## Public methods

| Method | Description |
|--------|-------------|
| `clearComment()` | Reset the comment textarea. Useful after a successful decision. |

## See also

- [`CnJsonViewer`](./cn-json-viewer.md) — drives the syntax-highlighted body.
- [`CnSignatureCapture`](./cn-signature-capture.md) — for sign-off flows requiring an evidentiary signature alongside the verdict.
