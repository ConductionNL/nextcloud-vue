<!--
  CnAppNav — manifest-driven app navigation.

  Renders the manifest's `menu[]` array as a Nextcloud app navigation
  (NcAppNavigation + NcAppNavigationItem). One level of nested
  `children[]` is supported. Items are sorted by `order`; items without
  an order render last. Items with a `permission` are filtered against
  the `permissions` prop — when the prop is omitted, all items render.

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
			<NcAppNavigationSettings>
				<NcAppNavigationItem
					v-for="item in settingsItems"
					:key="item.id"
					:name="resolveLabel(item)"
					:to="itemTo(item)"
					:exact="isExact(item)"
					:icon="item.icon"
					:active="isActive(item)"
					@click="onItemClick(item, $event)" />
			</NcAppNavigationSettings>
		</template>
	</NcAppNavigation>
</template>

<script>
import { NcAppNavigation, NcAppNavigationItem, NcAppNavigationSettings } from '@nextcloud/vue'

export default {
	name: 'CnAppNav',

	components: {
		NcAppNavigation,
		NcAppNavigationItem,
		NcAppNavigationSettings,
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
		 * Items that render inside `NcAppNavigationSettings` (the footer
		 * group below the separator). Use for help / docs / settings
		 * entries that should sit visually distinct from the main nav.
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
		 */
		itemTo(item) {
			if (item.href) return null
			return item.route ? { name: item.route } : null
		},
		/**
		 * Click handler. For external (`href`) items, opens the URL in a
		 * new tab with safe rel attributes. Route items are handled by
		 * `:to` and skip this path.
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
</style>
