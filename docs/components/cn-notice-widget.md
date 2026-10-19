# CnNoticeWidget

A toned notice box: an icon, a bold title and a line of text in one rounded box. Board DqSociaalDomein draws one in the case's side column: "**Bijzondere persoonsgegevens: gezondheid.** Elke inzage wordt gelogd met het doel." Widget type `notice`, usable in a detail page's side column, its body grid, and on a dashboard.

The surface applies the widget's `visibleWhen`, so a notice can show only for the records it concerns, for example a case whose type holds special-category data.

## Usage

```json
{
  "id": "special-data",
  "type": "notice",
  "content": {
    "variant": "warning",
    "title": "Special category data: health.",
    "text": "Every view is logged with its purpose."
  },
  "visibleWhen": { "field": "@context.caseType.specialCategories", "op": "notEmpty" }
}
```

Place it in a detail page with `config.sideColumn: ["special-data", …]`.

```vue
<CnNoticeWidget :content="{ variant: 'info', text: 'Read-only while the case is suspended.' }" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | `{ variant?, title?, text, icon? }`. `variant` is `info` (default), `warning`, `error` or `success`, each with its own tone and icon. `title` (bold) and `text` go through the app's translate. `icon` names a CnIcon instead of the variant's own. Without `title` and `text` nothing renders. |

The box is `role="note"`, named by its title.

A `banner` draws a Nextcloud note card meant for a full-width row: in a side column it nests a second box and has no title. Use `notice` there.
