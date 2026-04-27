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
		<NcAppNavigationItem
			v-for="item in visibleItems"
			:key="item.id"
			:name="resolveLabel(item)"
			:to="item.route ? { name: item.route } : null"
			:icon="item.icon"
			:active="isActive(item)">
			<NcAppNavigationItem
				v-for="child in visibleChildren(item)"
				:key="child.id"
				:name="resolveLabel(child)"
				:to="child.route ? { name: child.route } : null"
				:icon="child.icon"
				:active="isActive(child)" />
		</NcAppNavigationItem>
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
		 * Top-level items, filtered by permission and sorted by order.
		 * Items without an order sink to the bottom; otherwise stable
		 * by ascending order.
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
			if (!item.route) return false
			return this.$route?.name === item.route
		},
	},
}
</script>
