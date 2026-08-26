import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnBreadcrumbs.md'

# CnBreadcrumbs

Declarative breadcrumb trail. Feed it the whole path as one `crumbs` array — first entry is the root (typically a Home crumb), last entry is the current location. Every crumb but the last navigates via its `to` (router target) or `href` (plain URL); the last crumb renders unlinked with `aria-current="page"`, per the WAI-ARIA breadcrumb pattern.

**Wraps**: NcBreadcrumbs, NcBreadcrumb, CnIcon

## Try it

<Playground component="CnBreadcrumbs" />

## Usage

```vue
<template>
	<CnBreadcrumbs :crumbs="crumbs" />
</template>

<script>
import { CnBreadcrumbs } from '@conduction/nextcloud-vue'

export default {
	components: { CnBreadcrumbs },
	computed: {
		crumbs() {
			return [
				{ icon: 'Home', to: { name: 'SecretList' } },
				{ label: 'Team vault', to: { name: 'SecretListFolder', params: { folderId: '7' } } },
				{ label: 'Production' }, // current folder — unlinked, aria-current="page"
			]
		},
	},
}
</script>
```

A typical mount point is a page component's `below-header` area, e.g. CnIndexPage:

```vue
<CnIndexPage ...>
	<template #below-header>
		<CnBreadcrumbs :crumbs="crumbs" />
	</template>
</CnIndexPage>
```

## Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `crumbs` | Array | `[]` | No | The trail, root first, current location last. Each crumb: `{ label, to?, href?, icon? }`. `label` is the visible (pre-translated) text; `to` a vue-router target; `href` a plain URL (`to`/`href` are ignored on the last crumb); `icon` a PascalCase MDI name resolved through the CnIcon registry (register it with `registerIcons()` at boot). A crumb may be icon-only (e.g. the Home root). |
| `ariaLabel` | String | `t('Breadcrumbs')` | No | Accessible name of the breadcrumb `nav` landmark. Override per surface when a page carries more than one trail. |

## Behavior

- **Last crumb = current location.** It never navigates, even when the caller supplies `to`/`href`, and carries `aria-current="page"` so assistive tech announces the position.
- **Empty trail renders nothing** — no empty `nav` landmark is left behind.
- **Responsive collapse** (middle crumbs folding into an overflow menu on narrow widths) and the chevron separators come from the underlying NcBreadcrumbs.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnBreadcrumbs.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnBreadcrumbs/CnBreadcrumbs.vue) and update automatically whenever the component changes.

<GeneratedRef />
