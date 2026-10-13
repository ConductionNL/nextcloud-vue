# Design: screens-credentials-app-name

- A given name that is empty or equal to the app id is not a name.
- Nextcloud's app menu entries are in the page's initial state (`core` / `apps`): the entry whose `id` is the app id,
  else a `link` entry the app registered, gives the localised name.
- No entry (an app without a menu entry, or a page without that state): the id with its first letter in capitals,
  as the support note already does.
