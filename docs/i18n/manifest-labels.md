# Manifest labels in several languages

An app's labels live in its manifest, written once in one language. The manifest's `i18n` block holds translations of those labels, and every label the library shows from a manifest is looked up there first.

```json
"i18n": {
  "sourceLanguage": "nl",
  "languages": ["en", "de"],
  "labels": {
    "en": { "Vergunningen": "Permits", "Nieuwe aanvraag": "New application" },
    "de": { "Vergunningen": "Genehmigungen" }
  }
}
```

- `sourceLanguage` is the language the labels are written in.
- `languages` lists the languages translated into. The source language is not in it.
- `labels` maps a language to a map of the text as written to its translation. The key is the text itself, the way Nextcloud's `t()` works, so a label needs no second name.

The block validates against the v2 schema. `validateManifestV2` also refuses a `labels` language that is not in `languages` and a `sourceLanguage` that is also in `languages`.

## The lookup

`CnAppRoot` provides as `cnTranslate` a function that, for each label:

1. when the language is not the source language, returns the manifest's translation for the language, then for its base (`en_GB` falls back to `en`);
2. otherwise returns the host's `translate` result;
3. otherwise shows the text as written.

The fallback is per label, never per page: a label with no translation shows as written while its neighbours show translated. `{name}` placeholders are filled as `t()` does. The lookup reads the live manifest on each call, so an edit to the working copy shows at once. `CnWalkthrough` receives the same function.

The language is the user's Nextcloud language. `CnAppRoot`'s `language` prop overrides it, so a preview can show another language than the designer around it.

A manifest without `i18n` looks up nothing new: the host's `translate` runs as before.

## Which labels

Every manifest label the library shows passes the lookup: menu labels, page titles, column headers, header and bulk actions, row actions (label and title), sidebar titles, tab labels and column group labels, related-collection section titles, the search and store page titles, and on a form page the field labels, help, step titles and descriptions, the submit label, the success message and enum option labels. A form page uses the injected lookup when it has no `translate` prop of its own.

Test ids and the emitted action stay on the text as written, so a translation never breaks a selector or a `@action` handler.

## Accessibility

A label shown as its written text in a language other than the source carries `lang="<sourceLanguage>"`, so a screen reader pronounces it right.

## Not covered

Translating records (OpenRegister's `register-i18n`), schema property titles a page shows without a label of its own, and a form field's `placeholder`, which `CnFormPage` does not show.
