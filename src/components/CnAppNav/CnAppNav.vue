<!--
  CnAppNav — manifest-driven app navigation.

  Renders the manifest's `menu[]` array as a Nextcloud app navigation
  (NcAppNavigation + NcAppNavigationItem). One level of nested
  `children[]` is supported. Items are sorted by `order`; items without
  an order render last. Items with a `permission` are filtered against
  the `permissions` prop — when the prop is omitted, all items render.

  An optional primary action renders above the main list as an
  NcAppNavigationNew button (e.g. a "new" button or an active-context
  switcher). Hosts supply it via the `#primary-action` slot (full
  control over dynamic content + click handling); a static
  `nav.primaryAction` ({ label, icon?, route?, href? }) manifest field
  is the declarative fallback. The slot wins when both are present;
  nothing renders when neither is.

  Items split into three groups by `section`:
  - `section: "main"` (default) — top of the navigation, scrollable.
  - `section: "footer"` — rendered in NcAppNavigation's `#footer` slot,
    OUTSIDE the scrollable list and directly above the settings foldout,
    so they stay visible regardless of how long the main menu is. (The
    earlier `pinned`-prop approach kept them inside the scroll container:
    `margin-top: auto` only bottom-pins while the list does not overflow,
    so apps with long menus showed them mid-scroll.) For always-visible,
    non-settings links: Documentation, Features & Roadmap, About.
  - `section: "settings"` — rendered INSIDE an NcAppNavigationSettings
    foldout (the NC-native gear-icon button that slides a panel open).
    A "Personal settings" entry is auto-prepended at the top of the
    foldout (opens the host app's NcAppSettingsDialog via
    cnOpenUserSettings); opt out with `nav.includePersonalSettings:
    false`. The foldout mounts whenever there are settings items OR
    personal settings is enabled — so every app shows a Settings gear
    with at least Personal settings. It is only fully suppressed when
    there are no settings items AND `nav.includePersonalSettings: false`.

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
		<template v-if="$slots.search || $scopedSlots.search" #search>
			<!--
				@slot search
				@description Forwarded into NcAppNavigation's #search slot.
				Hosts mount NcAppNavigationSearch here. When unset, no search
				input renders inside the navigation.
			-->
			<slot name="search" />
		</template>
		<!-- @slot primary-action Optional primary action rendered above the
		     main list as NcAppNavigation's top region (e.g. an app's "new"
		     button or an active-context switcher). When provided, it takes
		     precedence over the manifest-declared primaryAction (page-scoped
		     OR nav root). Omitted entirely when neither the slot nor any
		     resolvable primaryAction is present. -->
		<slot name="primary-action">
			<NcAppNavigationNew
				v-if="activePrimaryAction"
				:text="resolveLabel(activePrimaryAction)"
				data-testid="cn-nav-primary-action"
				@click="onPrimaryActionClick">
				<template #icon>
					<component :is="primaryActionIconComponent" :size="20" />
				</template>
			</NcAppNavigationNew>
		</slot>
		<template #list>
			<template v-for="item in mainItems">
				<NcAppNavigationCaption
					v-if="isCaption(item)"
					:key="item.id"
					:name="resolveLabel(item)"
					:data-testid="`cn-nav-caption-${item.id}`" />
				<NcAppNavigationItem
					v-else
					:key="item.id"
					:name="resolveLabel(item)"
					:to="itemTo(item)"
					:href="itemHref(item)"
					:exact="isExact(item)"
					:icon="cssIconClass(item)"
					:active="isActive(item)"
					:pinned="Boolean(item.pinned)"
					:allow-collapse="visibleChildren(item).length > 0"
					:open="isItemOpen(item)"
					:data-testid="`cn-nav-entry-${item.id}`"
					@update:open="setItemOpen(item, $event)"
					@click="onItemClick(item, $event)">
					<template v-if="mdiIconComponent(item)" #icon>
						<component :is="mdiIconComponent(item)" :size="20" />
					</template>
					<template v-if="resolveCount(item)" #counter>
						<NcCounterBubble
							:count="resolveCount(item)"
							:active="isActive(item)" />
					</template>
					<template v-if="hasItemActionsSlot(item)" #actions>
						<!--
							@slot `item-${item.id}-actions`
							@description Per-item scoped slot whose content lands inside
							the NcAppNavigationItem's #actions slot for the menu entry
							with that id. Use it for inline NcActions menus (e.g. an
							item-level "Pin" button). Scope receives the menu item.
							@binding {object} item The menu item descriptor.
						-->
						<slot :name="`item-${item.id}-actions`" :item="item" />
					</template>
					<NcAppNavigationItem
						v-for="child in visibleChildren(item)"
						:key="child.id"
						:name="resolveLabel(child)"
						:to="itemTo(child)"
						:href="itemHref(child)"
						:exact="isExact(child)"
						:icon="cssIconClass(child)"
						:active="isActive(child)"
						:pinned="Boolean(child.pinned)"
						:data-testid="`cn-nav-entry-${child.id}`"
						@click="onItemClick(child, $event)">
						<template v-if="mdiIconComponent(child)" #icon>
							<component :is="mdiIconComponent(child)" :size="20" />
						</template>
						<template v-if="resolveCount(child)" #counter>
							<NcCounterBubble
								:count="resolveCount(child)"
								:active="isActive(child)" />
						</template>
					</NcAppNavigationItem>
				</NcAppNavigationItem>
			</template>

		</template>
		<template v-if="footerItems.length > 0 || showSettingsFoldout" #footer>
			<!-- Footer-section entries (Documentation, Features & Roadmap,
			     About) live in NcAppNavigation's #footer slot — OUTSIDE the
			     scrollable list — so they stay visible above the settings
			     foldout no matter how long the main menu is. The pinned-prop
			     approach only bottom-pinned while the list did not overflow. -->
			<ul v-if="footerItems.length > 0" class="cn-app-nav__footer-list">
				<NcAppNavigationItem
					v-for="item in footerItems"
					:key="item.id"
					:name="resolveLabel(item)"
					:to="itemTo(item)"
					:href="itemHref(item)"
					:exact="isExact(item)"
					:icon="cssIconClass(item)"
					:active="isActive(item)"
					:data-testid="`cn-nav-entry-${item.id}`"
					@click="onItemClick(item, $event)">
					<template v-if="mdiIconComponent(item)" #icon>
						<component :is="mdiIconComponent(item)" :size="20" />
					</template>
					<template v-if="resolveCount(item)" #counter>
						<NcCounterBubble
							:count="resolveCount(item)"
							:active="isActive(item)" />
					</template>
				</NcAppNavigationItem>
			</ul>
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
					<template v-for="item in settingsItems">
						<NcAppNavigationCaption
							v-if="isCaption(item)"
							:key="item.id"
							:name="resolveLabel(item)"
							:data-testid="`cn-nav-caption-${item.id}`" />
						<NcAppNavigationItem
							v-else
							:key="item.id"
							:name="resolveLabel(item)"
							:to="itemTo(item)"
							:href="itemHref(item)"
							:exact="isExact(item)"
							:icon="cssIconClass(item)"
							:active="isActive(item)"
							:data-testid="`cn-nav-entry-${item.id}`"
							@click="onItemClick(item, $event)">
							<template v-if="mdiIconComponent(item)" #icon>
								<component :is="mdiIconComponent(item)" :size="20" />
							</template>
							<template v-if="resolveCount(item)" #counter>
								<NcCounterBubble
									:count="resolveCount(item)"
									:active="isActive(item)" />
							</template>
						</NcAppNavigationItem>
					</template>
				</ul>
			</NcAppNavigationSettings>
		</template>
	</NcAppNavigation>
</template>

<script>
import { NcAppNavigation, NcAppNavigationCaption, NcAppNavigationItem, NcAppNavigationNew, NcAppNavigationSettings, NcCounterBubble } from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { translate as t } from '@nextcloud/l10n'
import { ICON_MAP } from '../CnIcon/CnIcon.vue'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'

export default {
	name: 'CnAppNav',

	components: {
		NcAppNavigation,
		NcAppNavigationCaption,
		NcAppNavigationItem,
		NcAppNavigationNew,
		NcAppNavigationSettings,
		NcCounterBubble,
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
		/**
		 * Provided by CnAppRoot — reactive `{ [register]: { [schema]: number } }`
		 * map populated from `useObjectStore().totals` for every
		 * `count: "auto"` menu entry whose resolved page is `type: "index"`
		 * with `register + schema` in its config. Defaults to an empty
		 * object so `resolveCount` returns `null` (no badge) when CnAppNav
		 * is mounted outside a CnAppRoot ancestor.
		 *
		 * @type {{ [register: string]: { [schema: string]: number } }}
		 */
		cnMenuCounts: { default: () => ({}) },
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
		 * @type {((key: string) => string)|null}
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

	data() {
		return {
			/**
			 * Per-item expand/collapse state for menu groups, keyed by
			 * item id. Seeded lazily from the manifest's `item.open` by
			 * `isItemOpen`; written by the collapse chevron (via
			 * `@update:open`) and by title clicks on route-less group
			 * items (via `onItemClick`).
			 */
			openState: {},
		}
	},

	computed: {
		effectiveManifest() {
			return this.manifest ?? this.cnManifest
		},
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},
		/**
		 * Manifest-declared root-level primary action (`nav.primaryAction`)
		 * — retained for backwards compatibility with code that reads this
		 * computed. New code SHOULD read `activePrimaryAction` instead,
		 * which also handles the page-scoped override.
		 *
		 * @return {object|null} `{ label, icon?, route?, href?, id?, payload? }` or null.
		 */
		primaryAction() {
			return this.effectiveManifest?.nav?.primaryAction ?? null
		},
		/**
		 * Resolved primary action for the current route. Resolution order:
		 *  1. The current route's matching `pages[].primaryAction`
		 *  2. `manifest.nav.primaryAction` as app-wide default
		 *  3. `null` — no primary-action button renders
		 *
		 * Page-scoped declarations always win over the nav-root default.
		 *
		 * @return {object|null}
		 */
		activePrimaryAction() {
			const pages = this.effectiveManifest?.pages ?? []
			const routeName = this.$route?.name
			if (routeName) {
				const page = pages.find((p) => p.id === routeName)
				if (page && page.primaryAction) return page.primaryAction
			}
			return this.effectiveManifest?.nav?.primaryAction ?? null
		},
		/**
		 * MDI icon component for the resolved primary action. Honors the
		 * action's `icon` field when set; falls back to the canonical
		 * `Plus` icon to match NC's NcAppNavigationNew default styling.
		 *
		 * @return {import('vue').Component}
		 */
		primaryActionIconComponent() {
			return this.mdiIconComponent(this.activePrimaryAction) ?? Plus
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
		 * Whether the settings foldout mounts. Mounts when there is at
		 * least one `section: "settings"` item OR personal settings is
		 * enabled — so every app shows a Settings gear with at least the
		 * auto-prepended "Personal settings" entry. Only fully suppressed
		 * when there are no settings items AND `nav.includePersonalSettings`
		 * is explicitly `false`.
		 *
		 * @return {boolean}
		 */
		showSettingsFoldout() {
			return this.settingsItems.length > 0 || this.includePersonalSettings
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
		/**
		 * Route name of the menu item that best matches the current route.
		 * A direct match (current route name IS a menu target) wins;
		 * otherwise the current path is matched against each item's page
		 * path and the LONGEST prefix wins, so detail / nested routes (e.g.
		 * `/expenses/:id`) light up — and auto-expand — their index entry
		 * even though the detail route name is not in the menu. Longest
		 * prefix disambiguates nested namespaces (e.g. `/pos` vs
		 * `/pos/refunds`). Returns null when nothing matches.
		 *
		 * @return {string|null}
		 */
		activeRouteName() {
			const routeName = this.$route?.name
			const path = this.$route?.path
			const flat = []
			for (const item of this.visibleItems) {
				flat.push(item)
				for (const child of this.visibleChildren(item)) flat.push(child)
			}
			if (routeName && flat.some((it) => it.route === routeName)) return routeName
			if (!path) return routeName ?? null
			let best = null
			let bestLen = -1
			for (const it of flat) {
				if (!it.route) continue
				const pagePath = this.pageForItem(it)?.route
				if (!pagePath || pagePath === '/' || pagePath.includes(':')) continue
				if (path === pagePath || path.startsWith(pagePath + '/')) {
					if (pagePath.length > bestLen) {
						best = it.route
						bestLen = pagePath.length
					}
				}
			}
			return best ?? routeName ?? null
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
			return item.route === this.activeRouteName
		},
		/**
		 * Whether a menu entry renders as a `NcAppNavigationCaption`
		 * (`type: "caption"`) rather than a clickable
		 * `NcAppNavigationItem`. Caption entries ignore `route`, `href`,
		 * `action`, `icon`, `count`, `children`, and `pinned`.
		 *
		 * @param {{ type?: string }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		isCaption(item) {
			return item?.type === 'caption'
		},
		/**
		 * Whether the host has registered a scoped slot named
		 * `item-${id}-actions` for this menu item. Used to gate template
		 * rendering of the per-item `#actions` slot pass-through so items
		 * without a matching slot don't render an empty `<template #actions>`.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		hasItemActionsSlot(item) {
			if (!item?.id) return false
			const name = `item-${item.id}-actions`
			return Boolean(
				(this.$slots && this.$slots[name])
				|| (this.$scopedSlots && this.$scopedSlots[name]),
			)
		},
		/**
		 * Resolve the count value to render in this entry's
		 * `NcCounterBubble` (in the `#counter` slot of
		 * `NcAppNavigationItem`).
		 *
		 *  - Literal positive integer in `item.count` → return as-is.
		 *  - `item.count === "auto"` → look up the entry's resolved page;
		 *    when that page is `type: "index"` with a `register`/`schema`
		 *    in its `config`, return
		 *    `cnMenuCounts[register][schema] ?? null`.
		 *
		 * Returns `null` (no badge) when:
		 *  - `item.count` is unset or falsy
		 *  - The literal value is `0`
		 *  - `count === "auto"` but no matching index page resolves
		 *    (also emits a one-shot `console.warn`)
		 *  - The store has no entry for the resolved `(register, schema)`
		 *
		 * @param {object} item Menu entry descriptor.
		 * @return {number|null} Count to render, or null for no badge.
		 */
		resolveCount(item) {
			const raw = item?.count
			if (raw === undefined || raw === null) return null
			if (typeof raw === 'number') {
				return raw > 0 ? raw : null
			}
			if (raw !== 'auto') return null
			const page = this.pageForItem(item)
			const register = page?.config?.register
			const schema = page?.config?.schema
			if (page?.type !== 'index' || !register || !schema) {
				this.warnAutoCountMisconfigured(item)
				return null
			}
			const value = this.cnMenuCounts?.[register]?.[schema]
			if (typeof value !== 'number' || value <= 0) return null
			return value
		},
		/**
		 * One-shot `console.warn` per menu-item id for misconfigured
		 * `count: "auto"` entries (no resolvable index page). Keeps the
		 * console quiet on re-renders.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @return {void}
		 * @private
		 */
		warnAutoCountMisconfigured(item) {
			if (!this._autoCountWarned) this._autoCountWarned = new Set()
			if (this._autoCountWarned.has(item.id)) return
			this._autoCountWarned.add(item.id)
			// eslint-disable-next-line no-console
			console.warn(
				`[CnAppNav] Menu entry "${item.id}" declares count: "auto" but has no resolvable index-type page with register + schema config — no badge will render.`,
			)
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
		 * items (`action: "user-settings"`) and `href` items return
		 * `null` so the entry is NOT a vue-router link: action items
		 * fall through to the click handler, `href` items render a real
		 * anchor via `itemHref`. Route items return a named route.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {object|null} A `{ name }` route object, or null for
		 *   action / href / route-less items.
		 */
		itemTo(item) {
			if (item.action) return null
			if (item.href) return null
			return item.route ? { name: item.route } : null
		},
		/**
		 * Build the `:href` value for an `NcAppNavigationItem`. Returns
		 * the item's `href` so the entry renders as a real anchor whose
		 * destination is visible on hover and which gets the native link
		 * cursor. `NcAppNavigationItem` adds `target="_blank"` itself for
		 * external (`scheme://`) URLs, so those open in a new tab while
		 * internal app paths (e.g. `/index.php/apps/foo/`) navigate in the
		 * same tab — no `window.open` interception. Action items never
		 * carry an href. Returns `null` for non-href items so the entry
		 * stays a router-link / button.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {string|null} The destination URL, or null.
		 */
		itemHref(item) {
			if (item.action) return null
			return item.href || null
		},
		/**
		 * Whether a menu group renders expanded. Local `openState` (set
		 * by the chevron or a title click) wins; otherwise the group
		 * auto-expands when it contains the active route — so deep-linking
		 * to a child page reveals which group it lives in — and finally
		 * falls back to the manifest's `item.open` for the initial render.
		 *
		 * @param {{ id: string, open?: boolean }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		isItemOpen(item) {
			const local = this.openState[item.id]
			if (local !== undefined) return local
			if (this.hasActiveChild(item)) return true
			return Boolean(item.open)
		},
		/**
		 * Whether any of a group's visible children is the active route.
		 * Drives auto-expansion of the parent group on page load.
		 *
		 * @param {object} item Menu entry descriptor.
		 * @return {boolean}
		 */
		hasActiveChild(item) {
			return this.visibleChildren(item).some((child) => this.isActive(child))
		},
		/**
		 * Record a group's expand/collapse state. Bound to
		 * NcAppNavigationItem's `@update:open` (chevron clicks) and
		 * called from `onItemClick` for title clicks on route-less
		 * group items.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @param {boolean} value New open state.
		 */
		setItemOpen(item, value) {
			this.$set(this.openState, item.id, value)
		},
		/**
		 * Click handler. Dispatch order: action keyword → group toggle.
		 * For `action: "user-settings"` invokes the injected
		 * `cnOpenUserSettings` (provided by CnAppRoot) and prevents
		 * default. `href` items are NOT handled here — they render a real
		 * anchor via `itemHref`, so the browser navigates natively
		 * (external URLs open in a new tab, internal app paths in the same
		 * tab). Route-less items with visible children are pure group
		 * headers: their anchor is a dead `#` link, so clicking the title
		 * toggles the children open/closed (same effect as the collapse
		 * chevron). Route items are handled by `:to` and skip this path.
		 *
		 * @param {object} item Menu item being clicked.
		 * @param {Event} [event] Native click event (used to call
		 *   preventDefault for action / group links).
		 */
		onItemClick(item, event) {
			if (item.action === 'user-settings') {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.cnOpenUserSettings()
				return
			}
			if (!item.route && !item.href && this.visibleChildren(item).length > 0) {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.setItemOpen(item, !this.isItemOpen(item))
			}
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
		/**
		 * Click handler for the manifest-declared primary action. Emits
		 * `@primary-action` AND the back-compat `@primary-action-click`
		 * event for host-side handling, then performs default navigation:
		 * external `href` opens in a new tab; a `route` pushes the named
		 * vue-router route. No-op when neither is set. Not invoked when
		 * the host overrides the `#primary-action` slot (it provides its
		 * own handler).
		 *
		 * @param {Event} [event] Native click event.
		 * @return {void}
		 */
		onPrimaryActionClick(event) {
			const action = this.activePrimaryAction
			if (!action) return
			const payload = {
				id: action.id,
				label: action.label,
				icon: action.icon,
				route: action.route,
				href: action.href,
				payload: action.payload,
				page: this.$route?.name,
			}
			/**
			 * @event primary-action Emitted when the resolved primary-action button is clicked. Payload includes the action descriptor (`{ id, label, icon, route, href, payload }`) plus the current `page` (route name) for host dispatchers.
			 * @type {{ id?: string, label: string, icon?: string, route?: string, href?: string, payload?: unknown, page?: string }}
			 */
			this.$emit('primary-action', payload)
			/**
			 * @event primary-action-click Back-compat alias for `@primary-action`. Payload is the resolved primary action object as declared in the manifest.
			 */
			this.$emit('primary-action-click', action)
			if (action.href) {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				window.open(action.href, '_blank', 'noopener,noreferrer')
				return
			}
			if (action.route && this.$router) {
				this.$router.push({ name: action.route })
			}
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
 * Footer-section items (section: "footer") render in NcAppNavigation's
 * #footer slot, outside the scroll container, so they stay visible above
 * the settings foldout regardless of menu length. (The interim
 * `pinned`-prop approach kept them inside the scrollable list, where
 * `margin-top: auto` only bottom-pins while the list does not overflow —
 * long menus showed Documentation / Features & roadmap mid-scroll.)
 * The <ul> only resets list chrome and aligns with the 16px icon inset
 * of the main list; NC's own footer layout does the rest.
 *
 * As a direct `> ul` child of `.app-navigation__content`, NC's scoped rule
 * makes it a shrinkable, scrollable flex item (`overflow: hidden auto;
 * flex: 0 1 auto`). With a couple of footer entries that let the list be
 * squeezed a few pixels below its content and grow an unwanted scrollbar,
 * even on a short menu with plenty of room. Footer entries are few and must
 * always show in full, so opt out of shrinking and scrolling here.
 */
.cn-app-nav__footer-list {
	list-style: none;
	margin: 0;
	padding: 0;
	flex-shrink: 0 !important;
	overflow: visible !important;
}

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
