<!--
  CnAppNav — manifest-driven app navigation.

  Renders the manifest's `menu[]` array as a Nextcloud app navigation
  (NcAppNavigation + NcAppNavigationItem). One level of nested
  `children[]` is supported. Items are sorted by `order`; items without
  an order render last. Items with a `permission` are filtered against
  the `permissions` prop — when the prop is omitted, all items render.

  Items split into three groups by `section`:
  - `section: "main"` (default) — top of the navigation, scrollable.
  - `section: "footer"` — bottom-pinned entries rendered via
    NcAppNavigationItem's native `pinned` prop (NC's own
    `order: 2; margin-top: auto`), sticking to the bottom of the list
    above the settings foldout. For always-visible, non-settings links:
    Documentation, Features & Roadmap, About.
  - `section: "settings"` — rendered INSIDE an NcAppNavigationSettings
    foldout (the NC-native gear-icon button that slides a panel open).
    A "Personal settings" entry is auto-prepended at the top of the
    foldout (opens the host app's NcAppSettingsDialog via
    cnOpenUserSettings); opt out with `nav.includePersonalSettings:
    false`. The foldout only mounts when ≥1 settings item exists.

  Manifest and translate are injected from CnAppRoot by default but can
  also be passed as props for standalone use without CnAppRoot. Props
  win over inject when both are present.

  Items can opt out of routing in favour of a built-in action by
  setting `action: "user-settings"` on the manifest entry: clicking
  the item invokes the `cnOpenUserSettings` provide-injected by
  CnAppRoot, which opens the host app's NcAppSettingsDialog modal
  instead of navigating. Both `route` and `href` are ignored when
  `action` is set. The inject defaults to a no-op so CnAppNav stays
  usable standalone (without a CnAppRoot ancestor).

  See REQ-JMR-004 of the json-manifest-renderer specification.
-->
<template>
	<NcAppNavigation data-testid="cn-nav">
		<template #list>
			<NcAppNavigationItem
				v-for="item in mainItems"
				:key="item.id"
				:name="resolveLabel(item)"
				:to="itemTo(item)"
				:exact="isExact(item)"
				:icon="cssIconClass(item)"
				:active="isActive(item)"
				:data-testid="`cn-nav-entry-${item.id}`"
				@click="onItemClick(item, $event)">
				<template v-if="mdiIconComponent(item)" #icon>
					<component :is="mdiIconComponent(item)" :size="20" />
				</template>
				<NcAppNavigationItem
					v-for="child in visibleChildren(item)"
					:key="child.id"
					:name="resolveLabel(child)"
					:to="itemTo(child)"
					:exact="isExact(child)"
					:icon="cssIconClass(child)"
					:active="isActive(child)"
					:data-testid="`cn-nav-entry-${child.id}`"
					@click="onItemClick(child, $event)">
					<template v-if="mdiIconComponent(child)" #icon>
						<component :is="mdiIconComponent(child)" :size="20" />
					</template>
				</NcAppNavigationItem>
			</NcAppNavigationItem>

			<!-- Footer-section entries (Documentation, Features & Roadmap,
				     About) use NcAppNavigationItem's native `pinned` prop. NC
				     bottom-pins them (above the settings foldout) via its own
				     `order: 2; margin-top: auto` rule — no custom wrapper or
				     CSS, just the native primitive. -->
			<NcAppNavigationItem
				v-for="item in footerItems"
				:key="item.id"
				:pinned="true"
				:name="resolveLabel(item)"
				:to="itemTo(item)"
				:exact="isExact(item)"
				:icon="cssIconClass(item)"
				:active="isActive(item)"
				:data-testid="`cn-nav-entry-${item.id}`"
				@click="onItemClick(item, $event)">
				<template v-if="mdiIconComponent(item)" #icon>
					<component :is="mdiIconComponent(item)" :size="20" />
				</template>
			</NcAppNavigationItem>
		</template>
		<template v-if="showSettingsFoldout" #footer>
			<!-- Settings foldout (section: "settings" items). NC-native
			     gear-icon button that slides open a panel; the first entry
			     is an auto-prepended "Personal settings" that opens the
			     host app's NcAppSettingsDialog via cnOpenUserSettings. -->
			<NcAppNavigationSettings
				v-if="showSettingsFoldout"
				:name="settingsFoldoutLabel"
				data-testid="cn-nav-settings">
				<ul class="cn-app-nav__settings-list">
					<NcAppNavigationItem
						v-if="includePersonalSettings"
						:name="personalSettingsLabel"
						data-testid="cn-nav-personal-settings"
						@click="onPersonalSettingsClick">
						<template #icon>
							<Cog :size="20" />
						</template>
					</NcAppNavigationItem>
					<NcAppNavigationItem
						v-for="item in settingsItems"
						:key="item.id"
						:name="resolveLabel(item)"
						:to="itemTo(item)"
						:exact="isExact(item)"
						:icon="cssIconClass(item)"
						:active="isActive(item)"
						:data-testid="`cn-nav-entry-${item.id}`"
						@click="onItemClick(item, $event)">
						<template v-if="mdiIconComponent(item)" #icon>
							<component :is="mdiIconComponent(item)" :size="20" />
						</template>
					</NcAppNavigationItem>
				</ul>
			</NcAppNavigationSettings>
		</template>
	</NcAppNavigation>
</template>

<script>
import { NcAppNavigation, NcAppNavigationItem, NcAppNavigationSettings } from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import { translate as t } from '@nextcloud/l10n'
import { ICON_MAP } from '../CnIcon/CnIcon.vue'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'

export default {
	name: 'CnAppNav',

	components: {
		NcAppNavigation,
		NcAppNavigationItem,
		NcAppNavigationSettings,
		Cog,
	},

	inject: {
		cnManifest: { default: null },
		cnTranslate: { default: () => (key) => key },
		/**
		 * Provided by CnAppRoot — opens the host app's
		 * NcAppSettingsDialog. Defaults to a no-op so CnAppNav is
		 * still usable when mounted outside a CnAppRoot ancestor;
		 * the click silently does nothing in that case rather than
		 * throwing.
		 */
		cnOpenUserSettings: { default: () => () => {} },
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
		 * All visible items (filtered by permission and visibleIf conditions,
		 * sorted by order). Retained for backwards-compat with the previous
		 * public API and tests that read this computed; new code should use
		 * `mainItems` / `settingsItems` instead.
		 */
		visibleItems() {
			const items = this.effectiveManifest?.menu ?? []
			return items
				.filter((item) => this.passesPermission(item) && this.passesVisibleIf(item))
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
		 * Items pinned to the bottom of the navigation (section:
		 * "footer") — rendered as flat NcAppNavigationItems above the
		 * settings foldout. For always-visible, non-settings entries:
		 * Documentation, Features & Roadmap, About.
		 */
		footerItems() {
			return this.visibleItems.filter((item) => item.section === 'footer')
		},
		/**
		 * Items that render INSIDE the NcAppNavigationSettings foldout
		 * (section: "settings"). The foldout is the NC-native gear-icon
		 * button that slides a panel open; these entries are app-level
		 * configuration pages (Forms, Pipelines, Automations, …).
		 */
		settingsItems() {
			return this.visibleItems.filter((item) => item.section === 'settings')
		},
		/**
		 * Whether the settings foldout mounts. Mounts only when at least
		 * one `section: "settings"` item exists — an empty settings group
		 * shows no foldout (and thus no orphan Personal-settings entry).
		 *
		 * @return {boolean}
		 */
		showSettingsFoldout() {
			return this.settingsItems.length > 0
		},
		/**
		 * Whether to auto-prepend the "Personal settings" entry at the top
		 * of the foldout. On by default; opt out with
		 * `manifest.nav.includePersonalSettings: false` (e.g. when the app
		 * has no per-user NcAppSettingsDialog wired through
		 * cnOpenUserSettings).
		 *
		 * @return {boolean}
		 */
		includePersonalSettings() {
			return this.effectiveManifest?.nav?.includePersonalSettings !== false
		},
		/**
		 * Label for the foldout's gear button. Manifest override:
		 * `nav.settingsLabel`; defaults to "Settings".
		 *
		 * @return {string}
		 */
		settingsFoldoutLabel() {
			const custom = this.effectiveManifest?.nav?.settingsLabel
			if (typeof custom === 'string' && custom.length > 0) {
				return this.effectiveTranslate(custom)
			}
			return t('nextcloud-vue', 'Settings')
		},
		/**
		 * Label for the auto-prepended Personal-settings entry.
		 *
		 * @return {string}
		 */
		personalSettingsLabel() {
			return t('nextcloud-vue', 'Personal settings')
		},
	},

	methods: {
		/**
		 * Resolve a menu item's `icon` string to an MDI Vue component
		 * via the per-app `registerIcons()` registry. Returns the
		 * component when the icon name is a registered MDI key,
		 * otherwise `null` so the template falls back to the
		 * `:icon="cssIconClass(item)"` (CSS class) path.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {import('vue').Component|null}
		 */
		mdiIconComponent(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0) return null
			if (icon.startsWith('icon-')) return null
			return ICON_MAP[icon] || null
		},
		/**
		 * Pass-through for the `:icon` prop on NcAppNavigationItem when
		 * the manifest declares a Nextcloud CSS-class icon (`icon-*`).
		 * Returns an empty string when the icon is an MDI name so
		 * NcAppNavigationItem doesn't render a bogus CSS class — the
		 * `#icon` slot above handles the MDI path.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {string}
		 */
		cssIconClass(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0) return ''
			return icon.startsWith('icon-') ? icon : ''
		},
		passesPermission(item) {
			if (!item.permission) return true
			if (!this.permissions || this.permissions.length === 0) return true
			return this.permissions.includes(item.permission)
		},
		/**
		 * Evaluate a menu item's `visibleIf` condition block.
		 *
		 * Returns `true` (visible) when:
		 *  - No `visibleIf` is declared (backwards-compatible default).
		 *  - `visibleIf.appInstalled` is set AND the named app is
		 *    installed / enabled (checked via `OC.appswebroots` then the
		 *    capabilities fallback, cached per page load by `isAppInstalled`).
		 *  - Context-path predicates (any key that is a dot-separated path
		 *    into `manifest.runtime`) all pass against the current runtime
		 *    data. Predicates are evaluated by `passesContextPredicates`.
		 *    Example: `{ "user.primaryRole": { "in": ["hr", "compliance"] } }`
		 *    hides the entry unless `manifest.runtime.user.primaryRole` is
		 *    `"hr"` or `"compliance"`. When the runtime block is absent the
		 *    entry is hidden (fail-safe: never show role-gated items to
		 *    unidentified users).
		 *
		 * All conditions are combined with implicit AND — every condition
		 * must pass for the item to render. Returns `false` when any fails.
		 *
		 * @param {object} item Menu item (or child) to evaluate.
		 * @return {boolean} Whether the item should render.
		 */
		passesVisibleIf(item) {
			const condition = item.visibleIf
			if (!condition || typeof condition !== 'object') return true

			// Specialised condition: appInstalled.
			if (condition.appInstalled) {
				if (!isAppInstalled(condition.appInstalled)) return false
			}

			// Context-path predicates: any non-reserved key is a dot-path
			// into manifest.runtime evaluated by passesContextPredicates.
			const runtime = this.effectiveManifest?.runtime ?? null
			if (!passesContextPredicates(condition, runtime)) return false

			return true
		},
		visibleChildren(item) {
			if (!Array.isArray(item.children)) return []
			return item.children.filter(
				(c) => this.passesPermission(c) && this.passesVisibleIf(c),
			)
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
		 * Build the `:to` value for an `NcAppNavigationItem`. Action
		 * items (`action: "user-settings"`) and external (`href`)
		 * items return `null` so the underlying anchor falls through
		 * to the click handler instead of vue-router; route items
		 * return a named route.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {object|null} A `{ name }` route object, or null for
		 *   action / external / route-less items.
		 */
		itemTo(item) {
			if (item.action) return null
			if (item.href) return null
			return item.route ? { name: item.route } : null
		},
		/**
		 * Click handler. Dispatch order: action keyword → external href
		 * → route. For `action: "user-settings"` invokes the injected
		 * `cnOpenUserSettings` (provided by CnAppRoot) and prevents
		 * default. For `href` items, opens the URL in a new tab with
		 * safe rel attributes. Route items are handled by `:to` and
		 * skip this path.
		 *
		 * @param {object} item Menu item being clicked.
		 * @param {Event} [event] Native click event (used to call
		 *   preventDefault for action / external links).
		 */
		onItemClick(item, event) {
			if (item.action === 'user-settings') {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.cnOpenUserSettings()
				return
			}
			if (!item.href) return
			if (event && typeof event.preventDefault === 'function') {
				event.preventDefault()
			}
			window.open(item.href, '_blank', 'noopener,noreferrer')
		},
		/**
		 * Click handler for the auto-prepended Personal-settings entry in
		 * the settings foldout. Invokes the injected `cnOpenUserSettings`
		 * (provided by CnAppRoot → opens the host's NcAppSettingsDialog).
		 * No-op inject when mounted standalone.
		 *
		 * @return {void}
		 */
		onPersonalSettingsClick() {
			this.cnOpenUserSettings()
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
 * Footer-section items (section: "footer") now use NcAppNavigationItem's
 * native `pinned` prop — NC bottom-pins them via its own
 * `order: 2; margin-top: auto` rule. The previous hand-rolled
 * `.cn-app-nav__footer-list` <ul> wrapper (with overflow/padding/border
 * overrides) was the non-native bit that fought NC's layout and has been
 * removed entirely.
 */

/*
 * Align the settings foldout's items with the main/footer list items,
 * whose icons sit at a 16px inset. The foldout's items live in a bare
 * <ul> inside NcAppNavigationSettings' panel (`#app-settings`, padding
 * 3px), so without this they start ~5px further left and the icon
 * column looks ragged. (The native settings-toggle button sits ~1px
 * left of the 16px baseline, but NC owns that with an !important
 * shorthand — a sub-pixel difference we leave to the native component.)
 */
.cn-app-nav__settings-list {
	list-style: none;
	margin: 0;
	padding-inline-start: 5px;
}
</style>
