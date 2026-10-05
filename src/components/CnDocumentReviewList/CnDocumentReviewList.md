Five documents, two reviewed:

```vue
<CnDocumentReviewList
  title="Review documents"
  :documents="[
    { id: 1, name: 'Advice on street lighting', meta: 'PDF, from the resident file', reviewStatus: 'public' },
    { id: 2, name: 'Mail from the contractor about planning', meta: 'E-mail, 12 March 2026', reviewStatus: 'partly-public' },
    { id: 3, name: 'Council proposal', meta: 'PDF, already published', reviewStatus: 'to-review' },
    { id: 4, name: 'Internal budget note', meta: 'Word, 2 February 2026' },
    { id: 5, name: 'Quote for lamp posts', meta: 'PDF, 20 January 2026' },
  ]" />
```

Your own status field and values:

```vue
<CnDocumentReviewList
  title="Check attachments"
  status-field="verdict"
  row-action-label="Open"
  :statuses="[
    { value: 'approved', label: 'Approved', variant: 'success', reviewed: true },
    { value: 'rejected', label: 'Rejected', variant: 'error', reviewed: true },
    { value: 'open', label: 'Not checked' },
  ]"
  :documents="[
    { id: 1, name: 'Passport copy', verdict: 'approved' },
    { id: 2, name: 'Bank statement', verdict: 'open' },
  ]" />
```

Nothing to review:

```vue
<CnDocumentReviewList title="Review documents" :documents="[]" />
```

Records that name their fields differently. `name-field`, `meta-field`, `href-field` and `row-key` say where to look, `default-status` is the status of a document that carries none, and `title-tag` and `empty-text` adjust the heading and the empty state:

```vue
<CnDocumentReviewList
  title="Review documents"
  title-tag="h2"
  name-field="filename"
  meta-field="description"
  href-field="downloadUrl"
  row-key="uuid"
  default-status="to-review"
  empty-text="This request has no documents yet."
  :documents="[
    { uuid: 'a1', filename: 'advice.pdf', description: 'PDF, 240 kB', downloadUrl: '#advice', reviewStatus: 'public' },
    { uuid: 'b2', filename: 'note.docx', description: 'Word, 18 kB' },
  ]" />
```
