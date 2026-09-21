# savedViewRouteTarget

The vue-router target that sends a person to one saved view.

## Signature

```js
savedViewRouteTarget(page: object, view: object|string|number): { name: string, params: object }|null
```

`page` is the manifest page the view belongs to. `view` is the view object, or just its id.

## Usage

```js
import { savedViewRouteTarget } from '@conduction/nextcloud-vue'

savedViewRouteTarget(page, { id: 42 })
// { name: 'cases__view', params: { viewId: '42' } }
```

```vue
<router-link :to="savedViewRouteTarget(page, view)">
  {{ view.name }}
</router-link>
```

It answers `null` in two cases, and a caller should treat both as "no link here": the page declares no places, and the view has no id. A view object is read at `id` first and `uuid` second, which is the order OpenRegister's View API fills them.

The param is named to match the path the page registered, so a page that already binds `viewId` gets `savedViewId` here too. That is the whole reason to build targets with this rather than by hand.
