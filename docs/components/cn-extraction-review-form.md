# CnExtractionReviewForm

Review the fields a machine read from a document, and confirm the corrections. Each field shows its value and, when the draft carries one, how certain the reading was, in words: "Read with 97% certainty". A field under the threshold adds "Check this value", and a field someone changed before says "Corrected by hand". The certainty is text, never colour only.

Save sends only the fields that changed to the confirm endpoint. The server records them as human corrections, so the original reading and its certainty are never lost. An optional request endpoint asks for the document to be read again.

Reusers: shillinq receipts and imported bills, filinq (which produces the extraction drafts), dossiq incoming documents, pipelinq mail intake.

## Usage

```vue
<CnExtractionReviewForm
	:object="draft"
	schema="Receipt"
	:fields="[
		{ key: 'receiptNumber', label: 'Receipt number', required: true },
		{ key: 'receiptDate', label: 'Date', type: 'date' },
		{ key: 'amount', label: 'Amount', type: 'money' },
	]"
	:draft-source="{ confidencePath: 'fieldConfidence', correctedPath: 'humanCorrected' }"
	:threshold="0.8"
	:confirm-endpoint="{ url: '/apps/shillinq/api/v1/extraction/drafts/@objectId?schema=@config.schema' }"
	:request-endpoint="{ url: '/apps/shillinq/api/v1/extraction/request', body: { id: '@objectId', documentUri: '@object.sourceDocumentUri' } }"
	@saved="reload" />
```

The upload step before the review is a `CnFileField` in a `CnActionDialog`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | `Object` | `{}` | The draft record. |
| `objectId` | `String \| Number` | `''` | The draft's id for `@objectId`; empty uses `object.id`. |
| `schema` | `String` | `''` | The draft's schema, available as `@config.schema` in urls. |
| `fields` | `Array` | required | `[{ key, label, type?, required?, minorUnits? }]`. `type` is `text` (default), `number`, `date` or `money`. Money with `minorUnits` is stored in cents and shown in units. |
| `draftSource` | `Object` | `{ confidencePath: 'fieldConfidence', correctedPath: 'humanCorrected' }` | Where the draft keeps the certainty per field (an object of numbers from 0 to 1) and the list of fields corrected by hand. Dotted paths work. |
| `threshold` | `Number` | `0.8` | Certainty under which a field asks to be checked. |
| `confirmEndpoint` | `Object` | required | `{ url, method? }` that records the corrections; the method defaults to `PUT`. The body holds only the changed fields. |
| `requestEndpoint` | `Object` | `null` | `{ url, method?, body? }` that asks for the document to be read again; string body values take `@objectId` and `@object.<field>`. Without it the button is not shown. |

Every url takes `@objectId`, `@object.<field>` and `@config.schema`.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | the saved record | The corrections were recorded (`data.record` of the answer, or the answer). |
| `requested` | none | The document was sent to be read again. |

## Slots

None.

## Accessibility

Every input has a visible label. The certainty note is linked to its input with `aria-describedby`, so a screen reader reads it with the field. "Check this value" is said in words and also shown in bold, not by colour alone. A refusal from the server is announced as an alert.
