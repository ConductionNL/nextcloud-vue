# PRESENTATION_VIEW_MODES

The presentations a saved view can name, mapped onto the view modes `CnIndexPage` renders.

```js
import { PRESENTATION_VIEW_MODES } from '@conduction/nextcloud-vue'
```

```js
{
  table: 'table',
  cards: 'cards',
  kanban: 'board',
  board: 'board',
  calendar: 'calendar',
  map: 'map',
}
```

OpenRegister stores `viewType` and `CnIndexPage` renders `viewMode`. The two words were coined in different repositories for the same thing, and `kanban` and `board` are the same screen under two names. Translating in one frozen table beats every caller guessing which spelling renders.

[`resolveViewPresentation`](./resolve-view-presentation.md) reads it for you. Reach for the table directly only when you are writing a mode switcher of your own.
