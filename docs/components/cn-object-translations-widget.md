# CnObjectTranslationsWidget

An editor for one OpenRegister object's **translatable properties in every language its register serves**. It shows one completeness chip per language, a language tab strip, the source language read-only, an "Out of date" mark on a stale value, and one Save that writes each edited property back as a whole language map.

It translates nothing itself: the engine is OpenRegister's.

## Rules it keeps

- **Chips come from the register, not from the data.** A language nobody has started reads "0 of 5" instead of being left out.
- **A stale value counts as missing.** OpenRegister flips a derived translation to `outdated` when the source value changes. Its own `completeness` still counts such a row as done; this widget does not, because a stale label is a wrong label.
- **The whole language map is written**, without `X-Translation-Target-Language`. OpenRegister refuses a language-keyed body that carries that header, and keeps one that arrives without it.
- **Only what OpenRegister holds as translatable is offered.** The property list comes from `_meta.languageMeta`, so a property OpenRegister never read as translatable is not shown as a field that saves into nothing.
- **A failed read says so.** It never shows an empty editor.
- **Keyboard.** The language strip is a `tablist` with a `tabpanel`; Left/Right, Home and End move between languages.

It reloads on the `cn:page:refresh` event.

## Usage

On a detail page, as the widget type `object-translations` (register, schema and objectId come from the detail-context merge):

```json
{
  "id": "translations",
  "type": "object-translations",
  "title": "Translations",
  "icon": "Translate",
  "content": { "properties": ["title", "description"] }
}
```

Standalone:

```vue
<CnObjectTranslationsWidget register="my-register" schema="product" :object-id="uuid" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `register` | `String` | `''` | Register slug or id. |
| `schema` | `String \| Object` | `''` | Schema slug, or the schema object (its slug is used). |
| `objectId` | `String` | `''` | Object id; falls back to the route's `id`. |
| `apiBase` | `String` | `/apps/openregister/api` | API root. |
| `properties` | `Array` | `[]` | Whitelist of properties to offer; empty offers every translatable one. |
| `emptyText` | `String` | `''` | Shown when nothing is translatable; empty uses the default. |
| `content` | `Object` | `{}` | Stored widget content; `register`, `schema`, `objectId`, `apiBase` and `properties` are read from it too. |

## Endpoints

```
GET   {apiBase}/registers/{register}                                      languages, source first
GET   {apiBase}/registers/{register}/schemas                              property titles
GET   {apiBase}/objects/{register}/{schema}/{id}?_translations=all&_translationMeta=true
GET   {apiBase}/translations/object/{uuid}?schema={schema}                per-value status
PATCH {apiBase}/objects/{register}/{schema}/{id}                          { property: languageMap }
```

The helpers live in `src/utils/objectTranslations.js`.
