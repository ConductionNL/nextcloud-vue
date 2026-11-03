# Proposal: detail-page-record-rights

## Why

Members of a case's assigned group may read the case without being its handler. They need to see that the case is
read-only for them, and they need one button that makes them the handler. Today a detail page asks OpenRegister for
`@self.can` only for the Follow control, and its edit controls ignore `can.update`, so a reader is offered an edit that
the write refuses.

## What changes

- A detail page with `config.permissions: true` asks for `@self.can` on the object read, also with `follow: false`, and
  so does CnPageRenderer's warm read of the same object.
- While `can.update` is `false`, the page's Edit button, the header actions with `role` `edit` or `update`, and the
  inline editors of the data and map widgets are off. A record without `can`, and a page without `permissions`, keep
  today's controls.
- The rights reach the widgets as `cnRecordCan` and `cnRecordEdit.denied`, and the `actions` slot as `can`. Widgets show
  on them with the existing `visibleWhen` (`@self.can.<name>`).
- A banner action with `declaredAction` runs that OpenRegister declared action on the page's record and refreshes the
  page. It shows only while `@self.can` grants the action; a banner whose every action is withheld stays hidden.

## Scope

nextcloud-vue CnDetailPage, CnPageRenderer, CnDetailWidgetHost, CnBannerWidget and the v2 manifest schema. dossiq's
case page uses it for "Voeg jezelf toe als behandelaar". OpenRegister decides every right; the page only follows them.
