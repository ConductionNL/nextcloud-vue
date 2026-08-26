<!--
  CnBreadcrumbs — declarative breadcrumb trail wrapping NcBreadcrumbs.

  Renders a `crumbs` array as NcBreadcrumb entries: every crumb but the
  last navigates via `to` (router target) or `href` (plain anchor); the
  LAST crumb is the current location — rendered without a link target and
  carrying aria-current="page" so assistive tech announces the position
  in the trail. Crumb icons resolve by PascalCase MDI name through the
  shared CnIcon registry, so a home crumb is `{ icon: 'Home', to: … }`
  without the consumer importing an icon component.

  NcBreadcrumbs supplies the nav landmark, the chevron separators and the
  responsive collapse of middle crumbs into an overflow menu; this wrapper
  only owns the array-in API and the last-crumb semantics, keeping fleet
  apps from hand-rolling the same v-for.
-->
<template>
	<NcBreadcrumbs
		v-if="crumbs.length > 0"
		:aria-label="ariaLabel"
		data-testid="cn-breadcrumbs">
		<NcBreadcrumb
			v-for="(crumb, index) in crumbs"
			:key="`${index}-${crumb.label}`"
			:name="crumb.label"
			:to="isCurrent(index) ? undefined : crumb.to"
			:href="isCurrent(index) ? undefined : crumb.href"
			:aria-current="isCurrent(index) ? 'page' : undefined"
			:data-testid="`cn-breadcrumbs-crumb-${index}`">
			<template v-if="crumb.icon" #icon>
				<CnIcon :name="crumb.icon" :size="20" />
			</template>
		</NcBreadcrumb>
	</NcBreadcrumbs>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcBreadcrumbs, NcBreadcrumb } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnBreadcrumbs — declarative breadcrumb trail wrapping NcBreadcrumbs.
 *
 * Feed it the whole trail as one `crumbs` array — first entry is the root
 * (typically a Home crumb), last entry is the CURRENT location. Every crumb
 * but the last links via its `to` (router) or `href` (anchor); the last one
 * is rendered unlinked with `aria-current="page"`, per the WAI-ARIA
 * breadcrumb pattern.
 *
 * ```vue
 * <CnBreadcrumbs
 *   :crumbs="[
 *     { icon: 'Home', to: { name: 'SecretList' } },
 *     { label: 'Team vault', to: { name: 'SecretListFolder', params: { folderId: '7' } } },
 *     { label: 'Production' },
 *   ]" />
 * ```
 */
export default {
	name: 'CnBreadcrumbs',

	components: {
		NcBreadcrumbs,
		NcBreadcrumb,
		CnIcon,
	},

	props: {
		/**
		 * The trail, root first, current location LAST. Each crumb:
		 * `{ label, to?, href?, icon? }` — `label` is the visible (already
		 * translated) text, `to` a vue-router target, `href` a plain URL
		 * (use one or the other; both are ignored on the last crumb), and
		 * `icon` a PascalCase MDI name resolved via the CnIcon registry
		 * (register it with `registerIcons()` at boot).
		 *
		 * @type {Array<{label: string, to?: (object|string), href?: string, icon?: string}>}
		 */
		crumbs: {
			type: Array,
			default: () => [],
			validator: (value) => value.every(
				(crumb) => crumb && typeof crumb === 'object'
					&& (typeof crumb.label === 'string' || typeof crumb.icon === 'string'),
			),
		},
		/**
		 * Accessible name of the breadcrumb nav landmark. Defaults to the
		 * lib's translation of "Breadcrumbs"; override per surface when a
		 * page carries more than one trail.
		 */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Breadcrumbs'),
		},
	},

	methods: {
		/**
		 * Whether the crumb at `index` is the trail's last entry — the
		 * current location, which renders unlinked with aria-current.
		 *
		 * @param {number} index Crumb position in `crumbs`.
		 * @return {boolean}
		 */
		isCurrent(index) {
			return index === this.crumbs.length - 1
		},
	},
}
</script>
