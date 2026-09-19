# resolveViewPresentation

The view mode a saved view opens in, given what the host page can actually render.

## Signature

```js
resolveViewPresentation(view: object|null, registered?: string[]): {
  viewMode: string|null,
  offered: string[],
  warnings: string[],
}
```

`view` is the View API object, read at `presentation`. `registered` is the list of view modes the host page offers.

## Usage

```js
import { resolveViewPresentation } from '@conduction/nextcloud-vue'

resolveViewPresentation({ presentation: { viewType: 'kanban' } }, ['table', 'board'])
// { viewMode: 'board', offered: ['table', 'board'], warnings: [] }

resolveViewPresentation({ presentation: { viewType: 'map' } }, ['table', 'cards'])
// { viewMode: 'table', offered: [...], warnings: ['CnIndexPage: the view asks for the "map" presentation, which this page does not render'] }
```

## Three answers, on purpose

`viewMode` is what opens. `offered` is what the mode switcher may show. `warnings` is what to log, once.

A caller that gets only the winner has no way to say why it won. That matters most in the falling-back case: a view naming a presentation the host never registered opens in the page's own first mode instead of failing. A page that renders nothing looks exactly like a broken backend to the person who followed the link, and a table where a board was asked for is at least legible and says so in the console.

`viewMode` is `null` when the host offers no modes at all. It is not guessed as `table`: the caller knows its own default, and a second guess here would be a second source of truth.

`presentation.viewTypes` is read after `viewType`, so a view can name an order of preference. The names are translated through [`PRESENTATION_VIEW_MODES`](./presentation-view-modes.md).
