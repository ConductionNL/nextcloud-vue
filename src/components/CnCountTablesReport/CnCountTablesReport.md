CnCountTablesReport is an endpoint report about one record, drawn as name/count tables side by side: mail by sender, recipient and domain on a case; documents by author and type; any count of names. The reader names the record (prefilled with `objectId`) and chooses Show. The endpoint answers one list per table, each row a name and a `count`, plus the totals its sentence reads.

A refused or failed read shows the server's sentence and no counts, never the last answer. An answer whose `emptyField` is zero shows `emptyText`. With `csvParam` set, a Download CSV button asks the same endpoint for CSV.

Labels pass through the app's translate (`cnTranslate`), so they are written in the app's source language and translated there.

```vue
<template>
	<CnCountTablesReport
		url="/apps/dossiq/api/cases/{id}/reports/mail-parties"
		title="Collected mail by sender, recipient and domain"
		object-label="Case"
		:lists="[
			{ key: 'senders', label: 'Sender', nameField: 'address' },
			{ key: 'recipients', label: 'Recipient', nameField: 'address' },
			{ key: 'domains', label: 'Domain', nameField: 'domain' },
		]"
		totals="Mails collected: {mails}. Headers that could not be read: {unreadable}."
		empty-field="mails"
		empty-text="No mail collected on this case"
		csv-param="format=csv"
		note="A mail counts once for an address and once for a domain, also when it names them more than once." />
</template>
```

## Props

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `url` | String | required | The report endpoint, with `{id}` where the record goes |
| `objectId` | String | `''` | The record to prefill |
| `lists` | Array | `[]` | `{ key, label, nameField }`: one table per list in the answer at `key`, rows named by `nameField` (default `name`) |
| `totals` | String | `''` | The sentence above the tables; `{field}` reads a field of the answer |
| `emptyField` | String | `''` | The answer field whose zero means nothing to count; without it, all tables empty means nothing to count |
| `csvParam` | String | `''` | The query that asks for CSV, such as `format=csv`; empty hides the download |
| `emptyText` | String | `''` | Shown when there is nothing to count |
| `title` | String | `''` | The heading |
| `objectLabel` | String | `''` | The record field's label (default "Record") |
| `countLabel` | String | `''` | The count column's heading (default "Count") |
| `note` | String | `''` | A closing sentence under the tables |
