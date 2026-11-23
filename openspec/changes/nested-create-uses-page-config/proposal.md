# nested-create-uses-page-config: create from a picker with the form the page shows

## Why

The coordinator checked pipelinq live on 2026-10-07 (development, nextcloud-vue 2.66.0).
On Contacts > Add Contact, typing a new name in the Client picker offers `Create "…"`.
Choosing it opened a "Create Client" form that:

1. had no Name field, so the typed name went nowhere;
2. showed Correspondence language and Timezone as plain text boxes;
3. failed on Create with "The required property (contactsUid) is missing", because it
   did a plain `POST /objects/pipelinq/28` instead of pipelinq's contact-first create.

The cause is one lookup. The stored contact schema names its reference by schema id
(`client: { $ref: 28 }`), while the manifest page names the schema by slug
(`config.schema: 'client'`). The R3 lookup from `review-round-two` compared those two
strings, found no page, and fell back to the generic form. That also lost the page's
`fieldOverrides`, which is where pipelinq makes the read-only `name` editable and turns
language and time zone into pickers. The nested form never received them anyway: only the
schema, register and initial data were passed.

## What changes

1. The nested create matches the manifest page on the reference first. When that finds
   no page, it loads the referenced schema and matches on its slug, id and uuid too.
2. The nested form gets the page's `excludeFields`, `includeFields`, `fieldOverrides`,
   `formSize` and `formColumns`, the same settings `CnIndexPage` gives its own Add form.
3. The typed term goes into the reference's label field, or else the schema's `name`,
   `title` or `label`. A page override that makes a read-only name editable makes it
   visible and prefilled.

Without a matching page nothing changes: the generic form, as before.

## Impact

- `src/components/CnFormDialog/CnFormDialog.vue`: `openNestedCreate`, `appCreateFor`
  (now takes one or several schema references and returns the page and its form
  settings), new `nestedFormConfig` and `nestedPrefillKey`.
- No API change for apps. pipelinq needs no change: its manifest and registry already
  declare what the form now reads.
