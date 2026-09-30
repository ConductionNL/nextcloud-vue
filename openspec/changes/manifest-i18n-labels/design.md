# Design: manifest-i18n-labels

Read at nextcloud-vue development `3e606bf10`.

## What is there

- The manifest v2 schema refuses unknown top-level keys
  (`src/schemas/app-manifest-v2.schema.json:21`) and has no `i18n` key.
- `CnAppRoot` takes `translate` with an identity default
  (`src/components/CnAppRoot/CnAppRoot.vue:1332-1335`) and provides it
  unchanged as `cnTranslate` (`:832`). 43 files besides `CnAppRoot` read
  `cnTranslate`.
- `CnAppRoot` also hands the host `translate` straight to `CnWalkthrough`
  (`:495`).
- The library reads the user's language with `getLanguage()` from
  `@nextcloud/l10n` (`src/l10n/index.js:1`).
- The manifest reaches descendants through the `cnManifest` getter, which
  returns the editor's working copy while editing (`CnAppRoot.vue:771-773`).

## Decisions

### D1. The `i18n` block

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

The shape is buildiq's D1. `sourceLanguage` and each entry of
`languages` are Nextcloud language codes (`nl`, `en_GB`, `pt_BR`).
`labels` maps a language to a map of written text to translation, all
strings. `validateManifestV2` refuses a `labels` key that is not in
`languages`, and `sourceLanguage` inside `languages`.

Rejected: label ids (`"permits.title": "..."`). Every manifest label
would need a second name, and buildiq's D1 chose the written text on
purpose, the way Nextcloud's own `t()` works.

### D2. One lookup, provided by the root

`src/utils/manifestTranslate.js` builds a function
`(text, vars) => string` from three getters: the manifest (the
`cnManifest` source, so an edit in buildiq's Translations view shows at
once), the language, and the host `translate`. For a text:

1. When the language is not `sourceLanguage`, look in
   `labels[language]`, then in `labels[<base>]` where the base is the
   part before `_` (`en_GB` falls back to `en`). A hit is returned with
   `{name}` placeholders filled from `vars`, as `t()` does.
2. Otherwise call the host `translate(text, vars)` and return its
   answer.
3. The host's answer is the text itself when it has no translation, so
   the written text shows. A falsy answer also returns the text.

The fallback is per label, never per page (buildiq REQ-BQML-003).
`CnAppRoot` provides this function as `cnTranslate` and passes it to
`CnWalkthrough`. Its own chrome strings keep using the host `translate`.

Rejected: resolving labels once into a translated copy of the manifest.
Ids, route names and test ids are read from the same strings, and a
translated copy would break every lookup that compares them.

### D3. The language

`CnAppRoot` gains `language`, a string defaulting to `getLanguage()`.
buildiq's preview passes the language the maker picked, so the preview
shows English while the designer around it stays Dutch (REQ-BQML-004).
buildiq's D4 describes this as a translate function bound to the picked
language. With the lookup inside `CnAppRoot`, that function would only
be reached after the manifest lookup for the maker's own language, so the
prop is the way to pick the language.

### D4. Components that show a manifest label without the lookup

Read one by one. Each is fixed by passing the label through the injected
`cnTranslate`, or through the component's own `translate` prop falling
back to it.

| component | label shown raw | where |
|---|---|---|
| `CnFormPage` | field `label`, `help`, step `title` and `description`, submit label, success message | It translates with its own `translate` prop only, default `null` (`src/components/CnFormPage/CnFormPage.vue:394-397`, used at `:602-607` and `:624`), and never injects `cnTranslate`. `CnPageRenderer` does not pass one (`src/components/CnPageRenderer/CnPageRenderer.vue:1145-1150` lifts title, description, icon, widgets, actions and sidebar only). So on a manifest form page every call at `:95`, `:119`, `:125`, `:168`, `:226` and the field label in `src/composables/cnFormFieldRenderer.js:172-173` return the text as written. |
| `cnFormFieldRenderer` | enum and option labels | `resolveEnumOptions` builds `{ label }` without the translator (`src/composables/cnFormFieldRenderer.js:143-153`), even when one is given. |
| `CnRowActions` | `config.actions[].label` | Renders `{{ action.label }}` and reads no translator (`src/components/CnRowActions/CnRowActions.vue:19`). `CnIndexPage.mergedActions` passes the declared actions through `dispatchAction` unchanged (`src/components/CnIndexPage/CnIndexPage.vue:3929-3988`). Its dispatch context has no `translate` (`:3930-3935`), so a row action's `successMessage` and `errorMessage` skip translation too. The fix keeps `data-testid` on the written label (`CnRowActions.vue:12`). |
| `CnActionsBar` | `config.bulkActions[].label` | Renders `{{ entry.label }}` (`src/components/CnActionsBar/CnActionsBar.vue:308`), while header actions pass `effectiveTranslate` (`:174`). `CnIndexPage.mergedBulkActions` passes them unchanged (`CnIndexPage.vue:2769-2786`). |
| `CnIndexSidebar` | page `title`; `sidebar.columnGroups[]` labels and their column labels | `resolvedName` returns the title as given (`src/components/CnIndexSidebar/CnIndexSidebar.vue:454-459`, fed from `CnIndexPage.vue:735`). Group and column labels render at `:161` and `:176`. |
| `CnObjectSidebar` | `config.sidebarTabs[].label`; page `title` | Tabs render `:name="tab.label"` (`src/components/CnObjectSidebar/CnObjectSidebar.vue:181`) and the header uses the title as given (`:654-656`). `CnDetailPage` forwards both unchanged (`src/components/CnDetailPage/CnDetailPage.vue:4174-4176`, `:4193`). |
| `CnRelatedCollections` | `config.relatedCollections[].title` | Renders `{{ col.title }}` (`src/components/CnRelatedCollections/CnRelatedCollections.vue:13-15`) and reads no translator. |
| `CnSearchPage` | page `title` | Renders `{{ title }}` (`src/components/CnSearchPage/CnSearchPage.vue:4-6`). |
| `CnStorePage` | page `title` | `resolvedTitle` returns it as given (`src/components/CnStorePage/CnStorePage.vue:306-308`), shown at `:43-44`. |
| `CnAppRoot` | walkthrough copy | Hands the host `translate` to `CnWalkthrough` (`CnAppRoot.vue:495`), which would skip the manifest lookup. |

Read and already translated, so not changed: menu labels and the
primary action in `CnAppNav` (`src/components/CnAppNav/CnAppNav.vue:1078`);
page titles through `CnPageHeader` (`src/components/CnPageHeader/CnPageHeader.vue:145`,
`:154`); the detail and dashboard headings (`CnDetailPage` `resolvedTitle`,
`src/components/CnDashboardPage/CnDashboardPage.vue:17-19`); the reports
heading (`src/components/CnReportsPage/CnReportsPage.vue:258-261`);
column headers (`src/components/CnDataTable/CnDataTable.vue:99`) and the
column menu (`CnIndexPage.vue:508`); header actions (`CnActionsBar.vue:174`);
widget titles (`src/components/CnWidgetWrapper/CnWidgetWrapper.vue:646-648`);
empty states in `CnDataTable` (`:127`), `CnCardGrid`
(`src/components/CnCardGrid/CnCardGrid.vue:162`) and `CnObjectList`
(`src/components/CnObjectList/CnObjectList.vue:176`).

Not a translation gap: a form field's `placeholder`. Neither
`CnFormPage` nor `cnFormFieldRenderer` renders `field.placeholder`, so
buildiq's Translations view collects a text no screen shows.

Rejected: translating inside `CnPageRenderer` before props reach a page.
The renderer would have to know every label key of every page type,
which is the list above turned into a second place to keep up to date.

## Files

- `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`:
  the block and its checks.
- `src/utils/manifestTranslate.js`: new, the lookup of D2.
- `src/components/CnAppRoot/CnAppRoot.vue`: the `language` prop, the
  provide, the walkthrough hand-off.
- The D4 components: `src/components/CnFormPage/CnFormPage.vue`,
  `src/composables/cnFormFieldRenderer.js`,
  `src/components/CnRowActions/CnRowActions.vue`,
  `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/CnActionsBar/CnActionsBar.vue`,
  `src/components/CnIndexSidebar/CnIndexSidebar.vue`,
  `src/components/CnObjectSidebar/CnObjectSidebar.vue`,
  `src/components/CnDetailPage/CnDetailPage.vue`,
  `src/components/CnRelatedCollections/CnRelatedCollections.vue`,
  `src/components/CnSearchPage/CnSearchPage.vue`,
  `src/components/CnStorePage/CnStorePage.vue`.

## Accessibility

A label that falls back to the written text is in the source language,
not the user's. The lookup reports whether it fell back, and the D4
components put `lang="<sourceLanguage>"` on a heading, button or tab that
shows a fallback, so a screen reader pronounces it right.
