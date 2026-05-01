<!--
  CnAppNav — manifest-driven app navigation.

  Renders the manifest's `menu[]` array as a Nextcloud app navigation
  (NcAppNavigation + NcAppNavigationItem). One level of nested
  `children[]` is supported. Items are sorted by `order`; items without
  an order render last. Items with a `permission` are filtered against
  the `permissions` prop — when the prop is omitted, all items render.

  Items split into two groups by `section`:
  - `section: "main"` (default) — top of the navigation, scrollable.
  - `section: "settings"` — pinned to the bottom inside NcAppNavigation's
    `#footer` slot, always visible above the close-toggle, separated
    from the main list by a thin border. Use for documentation links,
    settings entries, or anything that should sit at the bottom.

  Manifest and translate are injected from CnAppRoot by default but can
  also be passed as props for standalone use without CnAppRoot. Props
  win over inject when both are present.

  See REQ-JMR-004 of the json-manifest-renderer specification.
-->
<template>
	<NcAppNavigation>
		<template #list>
			<NcAppNavigationItem
				v-for="item in mainItems"
				:key="item.id"
				:name="resolveLabel(item)"
				:to="itemTo(item)"
				:exact="isExact(item)"
				:icon="item.icon"
				:active="isActive(item)"
				@click="onItemClick(item, $event)">
				<NcAppNavigationItem
					v-for="child in visibleChildren(item)"
					:key="child.id"
					:name="resolveLabel(child)"
					:to="itemTo(child)"
					:exact="isExact(child)"
					:icon="child.icon"
					:active="isActive(child)"
					@click="onItemClick(child, $event)" />
			</NcAppNavigationItem>
		</template>
		<template v-if="settingsItems.length" #footer>
			<ul class="cn-app-nav__footer-list">
				<NcAppNavigationItem
					v-for="item in settingsItems"
					:key="item.id"
					:name="resolveLabel(item)"
					:to="itemTo(item)"
					:exact="isExact(item)"
					:icon="item.icon"
					:active="isActive(item)"
					@click="onItemClick(item, $event)" />
			</ul>
		</template>
	</NcAppNavigation>
</template>

<script>
import { NcAppNavigation, NcAppNavigationItem } from '@nextcloud/vue'

export default {
	name: 'CnAppNav',

	components: {
		NcAppNavigation,
		NcAppNavigationItem,
	},

	inject: {
		cnManifest: { default: null },
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Manifest object. Falls back to injected `cnManifest`. Provide
		 * explicitly when mounting CnAppNav outside of CnAppRoot.
		 *
		 * @type {object|null}
		 */
		manifest: {
			type: Object,
			default: null,
		},
		/**
		 * Translate function. Falls back to injected `cnTranslate`,
		 * which itself defaults to an identity function.
		 *
		 * @type {Function|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
		/**
		 * List of permission strings the current user holds. Items
		 * declaring a `permission` only render when their permission
		 * appears in this list. When the prop is omitted (or empty),
		 * all items are visible regardless of their permission field.
		 *
		 * @type {Array<string>}
		 */
		permissions: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		effectiveManifest() {
			return this.manifest ?? this.cnManifest
		},
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},
		/**
		 * All visible items (filtered by permission, sorted by order).
		 * Retained for backwards-compat with the previous public API and
		 * tests that read this computed; new code should use
		 * `mainItems` / `settingsItems` instead.
		 */
		visibleItems() {
			const items = this.effectiveManifest?.menu ?? []
			return items
				.filter((item) => this.passesPermission(item))
				.slice()
				.sort((a, b) => {
					const aHas = typeof a.order === 'number'
					const bHas = typeof b.order === 'number'
					if (aHas && !bHas) return -1
					if (!aHas && bHas) return 1
					if (!aHas && !bHas) return 0
					return a.order - b.order
				})
		},
		/** Items that render in the top list (default placement). */
		mainItems() {
			return this.visibleItems.filter((item) => (item.section ?? 'main') === 'main')
		},
		/**
		 * Items that render inside the `#footer` slot of NcAppNavigation
		 * — always visible at the bottom of the navigation, above the
		 * close-toggle. Use for help / docs / settings entries that
		 * should anchor to the bottom rather than scroll with the main
		 * list.
		 */
		settingsItems() {
			return this.visibleItems.filter((item) => item.section === 'settings')
		},
	},

	methods: {
		passesPermission(item) {
			if (!item.permission) return true
			if (!this.permissions || this.permissions.length === 0) return true
			return this.permissions.includes(item.permission)
		},
		visibleChildren(item) {
			if (!Array.isArray(item.children)) return []
			return item.children.filter((c) => this.passesPermission(c))
		},
		resolveLabel(item) {
			return this.effectiveTranslate(item.label)
		},
		isActive(item) {
			if (item.href || !item.route) return false
			return this.$route?.name === item.route
		},
		/**
		 * Look up an item's resolved page (`pages[]` entry whose `id`
		 * matches the menu item's `route`) — used to decide whether the
		 * NcAppNavigationItem should match its router-link `exact`.
		 *
		 * @param {object} item Menu item to resolve.
		 * @return {object|null} Matching page entry, or null when the item
		 *   has no `route` or no page matches.
		 */
		pageForItem(item) {
			if (!item.route) return null
			const pages = this.effectiveManifest?.pages ?? []
			return pages.find((p) => p.id === item.route) ?? null
		},
		/**
		 * Pass-through for `NcAppNavigationItem`'s router-link `exact`.
		 * Root paths (`/`) match every nested route by default, which
		 * makes the root item permanently look active. Returning true
		 * for `route === '/'` restores the expected behaviour.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {boolean} Whether to enable exact router-link matching.
		 */
		isExact(item) {
			const page = this.pageForItem(item)
			return page?.route === '/'
		},
		/**
		 * Build the `:to` value for an `NcAppNavigationItem`. External
		 * (`href`) items return `null` so the underlying anchor falls
		 * through to a click handler instead of vue-router; route items
		 * return a named route.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {object|null} A `{ name }` route object, or null for
		 *   external / route-less items.
		 */
		itemTo(item) {
			if (item.href) return null
			return item.route ? { name: item.route } : null
		},
		/**
		 * Click handler. For external (`href`) items, opens the URL in a
		 * new tab with safe rel attributes. Route items are handled by
		 * `:to` and skip this path.
		 *
		 * @param {object} item Menu item being clicked.
		 * @param {Event} [event] Native click event (used to call
		 *   preventDefault for external links).
		 */
		onItemClick(item, event) {
			if (!item.href) return
			if (event && typeof event.preventDefault === 'function') {
				event.preventDefault()
			}
			window.open(item.href, '_blank', 'noopener,noreferrer')
		},
	},
}
</script>

<style>
/*
 * The legacy `icon-*` classes in Nextcloud render a background-image
 * with a hardcoded dark fill, so they stay grey when an entry becomes
 * active (text turns white against the primary-element background).
 * Force the icon to white in the active state to match the label.
 * Only applies when the icon is provided via the `icon` prop (CSS
 * class) — items using a `<template #icon>` MDI component already
 * inherit `currentColor`.
 */
.app-navigation-entry.active .app-navigation-entry-icon[class*="icon-"] {
	filter: brightness(0) invert(1);
}

/*
 * Footer-list (section: "settings" items rendered in NcAppNavigation's
 * `#footer` slot). Reset list defaults so the entries align with the
 * main list, and add a thin separator above the group so it visually
 * detaches from the scrollable list when the two meet.
 *
 * NcAppNavigation's scoped style targets `.app-navigation__content >
 * ul` with `overflow-y: auto` + flex padding, and Vue 2 propagates the
 * parent's data-v attribute onto slot-root elements — so without these
 * overrides the footer list renders its own scrollbar even though the
 * footer area has plenty of room. The `!important` flags force-beat
 * the parent rule's specificity (which includes the data-v attribute).
 */
.cn-app-nav__footer-list {
	list-style: none;
	margin: 0;
	padding: 0 !important;
	border-top: 1px solid var(--color-border);
	overflow: visible !important;
	flex: 0 0 auto;
}
</style>
