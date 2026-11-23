# CnSavedViewMenuSettings

The user's "My views" menu entries as a settings section body, as board DqPersoonlijkeInstellingen draws "Views in my menu".

- The entries are listed in their menu order. The user reorders them by dragging or with the arrow keys.
- "Remove from menu" takes an entry out of the menu. It never deletes the view.
- A picker adds any view the user can see on a page of the app: their own views, views shared with them, and the pages' default views (`defaultSavedViews`).
- Each row says what its view shows and how many records that is, for example "Case type Woo request, status open · 19 cases".
  - The line is built from the view's filters, with the page schema's titles and the names of the records and options they point at.
  - The count is one request per view, cached for the session. It fills in when it arrives and does not hold up the list.
- Only index pages that offer saved views are searched (see `allowSavedViews` on CnIndexPage).

## Where it is drawn

CnAppRoot draws it as the `views` section of its user settings dialog, so an app on CnAppRoot needs nothing more. An app with a settings dialog of its own can mount it inside an `NcAppSettingsSection`:

```vue
<NcAppSettingsSection id="views" :name="t('myapp', 'Views in my menu')">
  <CnSavedViewMenuSettings />
</NcAppSettingsSection>
```

## What it reads

The component takes no props, emits no events and has no slots. It works through what CnAppRoot provides:

| Injection | Description |
|-----------|-------------|
| `cnSavedViewMenu` | The menu list and its `set()`; stored in the `cn_saved_view_menu` preference |
| `cnManifest` | The app manifest, for the index pages that offer saved views and their default views |
| `cnTranslate` | The app's translate, for page titles and default view names |
| `cnAppId` | The app id |
| `cnAppConfig` | The app config, for `@config` tokens in a page's base filter |

Without a `cnSavedViewMenu` that can be changed, the list is read-only.
