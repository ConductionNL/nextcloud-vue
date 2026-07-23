<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-menu-widget"
		:class="rootClasses"
		@keydown.esc.stop="closeAll">
		<!-- Empty state -->
		<div
			v-if="isEmpty"
			class="cn-menu-widget__empty"
			:class="{ 'cn-menu-widget__empty--clickable': isInEditMode }"
			:role="isInEditMode ? 'button' : null"
			:tabindex="isInEditMode ? 0 : -1"
			@click="onEmptyStateClick"
			@keyup.enter="onEmptyStateClick"
			@keyup.space="onEmptyStateClick">
			<span class="cn-menu-widget__empty-icon" aria-hidden="true">⚙</span>
			<span>{{ t('nextcloud-vue', 'No menu items yet — click the gear icon to add some.') }}</span>
		</div>

		<!-- Tree style -->
		<ul
			v-else-if="effectiveStyle === 'tree'"
			class="cn-menu-widget__tree"
			role="tree">
			<CnMenuTreeNode
				v-for="(item, idx) in items"
				:key="`tree-${idx}`"
				:item="item"
				:depth="1"
				:show-icons="showIcons"
				:expanded-by-default="expandedByDefault"
				:active-path="activePath"
				:active-leaf-key="activeLeafKey"
				:current-key="`${idx}`"
				:active-highlight="activeItemHighlight"
				@navigate="onNavigate" />
		</ul>

		<!-- Megamenu style -->
		<div
			v-else-if="effectiveStyle === 'megamenu'"
			class="cn-menu-widget__megamenu">
			<ul
				class="cn-menu-widget__bar"
				role="menubar">
				<li
					v-for="(item, idx) in items"
					:key="`mega-top-${idx}`"
					role="none"
					class="cn-menu-widget__bar-item">
					<button
						:ref="(el) => setTopRef(el, idx)"
						type="button"
						role="menuitem"
						class="cn-menu-widget__bar-button"
						:class="topItemClass(`${idx}`)"
						:aria-haspopup="hasChildren(item) ? 'menu' : null"
						:aria-expanded="megaOpenIndex === idx ? 'true' : 'false'"
						@click="onMegaTopClick(idx, item)"
						@keydown="onMegaTopKey($event, idx, item)">
						<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !item.icon }">
							<CnMenuItemIcon v-if="item.icon" :icon="item.icon" />
						</span>
						<span class="cn-menu-widget__label">{{ item.label }}</span>
					</button>
				</li>
			</ul>
			<div
				v-if="megaOpenIndex !== null && hasChildren(items[megaOpenIndex])"
				ref="megaPanel"
				class="cn-menu-widget__mega-panel"
				role="menu">
				<div
					v-for="(child, childIdx) in items[megaOpenIndex].children"
					:key="`mega-group-${childIdx}`"
					class="cn-menu-widget__mega-group">
					<button
						type="button"
						role="menuitem"
						class="cn-menu-widget__mega-group-title"
						:class="topItemClass(`${megaOpenIndex}.${childIdx}`)"
						@click="onNavigate(child)">
						<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !child.icon }">
							<CnMenuItemIcon v-if="child.icon" :icon="child.icon" />
						</span>
						<span class="cn-menu-widget__label">{{ child.label }}</span>
					</button>
					<ul
						v-if="hasChildren(child)"
						class="cn-menu-widget__mega-leaves">
						<li
							v-for="(leaf, leafIdx) in child.children"
							:key="`mega-leaf-${leafIdx}`"
							role="none">
							<button
								type="button"
								role="menuitem"
								class="cn-menu-widget__mega-leaf"
								:class="topItemClass(`${megaOpenIndex}.${childIdx}.${leafIdx}`)"
								@click="onNavigate(leaf)">
								<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !leaf.icon }">
									<CnMenuItemIcon v-if="leaf.icon" :icon="leaf.icon" />
								</span>
								<span class="cn-menu-widget__label">{{ leaf.label }}</span>
							</button>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Dropdown style (default) -->
		<ul
			v-else
			class="cn-menu-widget__bar"
			:class="{ 'cn-menu-widget__bar--vertical': orientation === 'vertical' }"
			role="menubar">
			<li
				v-for="(item, idx) in items"
				:key="`drop-top-${idx}`"
				:ref="(el) => setBarItemRef(el, idx)"
				role="none"
				class="cn-menu-widget__bar-item">
				<button
					:ref="(el) => setTopRef(el, idx)"
					type="button"
					role="menuitem"
					class="cn-menu-widget__bar-button"
					:class="topItemClass(`${idx}`)"
					:aria-haspopup="hasChildren(item) ? 'menu' : null"
					:aria-expanded="dropOpenIndex === idx ? 'true' : 'false'"
					@click="onDropdownTopClick(idx, item)"
					@keydown.tab="closeAll"
					@keydown.enter.prevent="onDropdownTopClick(idx, item)"
					@keydown.space.prevent="onDropdownTopClick(idx, item)"
					@keydown.down.prevent="openDropdown(idx)">
					<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !item.icon }">
						<CnMenuItemIcon v-if="item.icon" :icon="item.icon" />
					</span>
					<span class="cn-menu-widget__label">{{ item.label }}</span>
					<span v-if="hasChildren(item)" class="cn-menu-widget__caret" aria-hidden="true">▾</span>
				</button>
				<ul
					v-if="dropOpenIndex === idx && hasChildren(item)"
					class="cn-menu-widget__dropdown"
					role="menu">
					<li
						v-for="(child, childIdx) in item.children"
						:key="`drop-child-${childIdx}`"
						role="none"
						class="cn-menu-widget__dropdown-item-wrap"
						@mouseenter="hasChildren(child) && (flyoutOpenKey = `${idx}.${childIdx}`)">
						<button
							type="button"
							role="menuitem"
							class="cn-menu-widget__dropdown-item"
							:class="topItemClass(`${idx}.${childIdx}`)"
							@click="onNavigate(child)">
							<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !child.icon }">
								<CnMenuItemIcon v-if="child.icon" :icon="child.icon" />
							</span>
							<span class="cn-menu-widget__label">{{ child.label }}</span>
							<span v-if="hasChildren(child)" class="cn-menu-widget__caret cn-menu-widget__caret--right" aria-hidden="true">▸</span>
						</button>
						<ul
							v-if="flyoutOpenKey === `${idx}.${childIdx}` && hasChildren(child)"
							class="cn-menu-widget__flyout"
							role="menu">
							<li
								v-for="(leaf, leafIdx) in child.children"
								:key="`drop-leaf-${leafIdx}`"
								role="none">
								<button
									type="button"
									role="menuitem"
									class="cn-menu-widget__dropdown-item"
									:class="topItemClass(`${idx}.${childIdx}.${leafIdx}`)"
									@click="onNavigate(leaf)">
									<span v-if="showIcons" class="cn-menu-widget__icon" :class="{ 'cn-menu-widget__icon--hidden': !leaf.icon }">
										<CnMenuItemIcon v-if="leaf.icon" :icon="leaf.icon" />
									</span>
									<span class="cn-menu-widget__label">{{ leaf.label }}</span>
								</button>
							</li>
						</ul>
					</li>
				</ul>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnMenuTreeNode from './CnMenuTreeNode.vue'
import CnMenuItemIcon from './CnMenuItemIcon.vue'
import { isActiveItem, computeActivePath } from './menuActive.js'

const VALID_STYLES = ['dropdown', 'megamenu', 'tree']
const VALID_ORIENTATIONS = ['horizontal', 'vertical']
const VALID_HIGHLIGHTS = ['background', 'underline', 'left-bar', 'none']

/**
 * CnMenuWidget — renders a hierarchical navigation widget with three visual
 * styles (dropdown, megamenu, tree) and active-item highlighting based on
 * `window.location.pathname`.
 *
 * Active-item detection runs on mount and whenever `items` or the URL change;
 * ancestors of the active leaf are flagged "in-path" so the configured
 * highlight (`underline`, `background`, `left-bar`, `none`) renders
 * consistently. Keyboard navigation follows the WAI-ARIA Menu/Menubar pattern.
 *
 * Open dropdown/megamenu panels close on: re-clicking the toggle, Escape,
 * Tab, navigating a leaf, and clicking ANYWHERE else — including empty space
 * elsewhere in the widget itself, not just outside it entirely (a
 * document-level listener that checks containment against the open toggle
 * button + its own panel specifically, since the panels are plain in-DOM
 * markup, not a teleported popover with its own outside-click handling).
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnMenuWidget',

	components: {
		CnMenuTreeNode,
		CnMenuItemIcon,
	},

	props: {
		/**
		 * Persisted widget content `{items, style, orientation, showIcons,
		 * expandedByDefault, activeItemHighlight}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the current user is an admin (pairs with `canEdit`). */
		isAdmin: {
			type: Boolean,
			default: false,
		},
		/** Whether the surrounding shell is in edit mode. */
		canEdit: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/** Fired when the empty-state gear is clicked in edit mode. */
		'edit-request',
	],

	data() {
		return {
			dropOpenIndex: null,
			flyoutOpenKey: null,
			megaOpenIndex: null,
			currentLocation: this.readLocation(),
			topRefs: [],
			barItemRefs: [],
		}
	},

	computed: {
		/**
		 * The configured menu items.
		 *
		 * @return {object[]} the items array.
		 */
		items() {
			const arr = this.content?.items
			return Array.isArray(arr) ? arr : []
		},

		/**
		 * Whether the menu has no items.
		 *
		 * @return {boolean} true when empty.
		 */
		isEmpty() {
			return this.items.length === 0
		},

		/**
		 * The validated visual style (default `dropdown`).
		 *
		 * @return {string} one of dropdown/megamenu/tree.
		 */
		effectiveStyle() {
			const s = this.content?.style
			return VALID_STYLES.includes(s) ? s : 'dropdown'
		},

		/**
		 * The validated orientation (tree is always vertical).
		 *
		 * @return {string} `horizontal` or `vertical`.
		 */
		orientation() {
			const o = this.content?.orientation
			if (this.effectiveStyle === 'tree') {
				return 'vertical'
			}
			return VALID_ORIENTATIONS.includes(o) ? o : 'horizontal'
		},

		/**
		 * Whether item icons render (default true).
		 *
		 * @return {boolean} the showIcons flag.
		 */
		showIcons() {
			return this.content?.showIcons !== false
		},

		/**
		 * Whether tree nodes start expanded.
		 *
		 * @return {boolean} the expandedByDefault flag.
		 */
		expandedByDefault() {
			return this.content?.expandedByDefault === true
		},

		/**
		 * The validated active-item highlight style (default `underline`).
		 *
		 * @return {string} one of background/underline/left-bar/none.
		 */
		activeItemHighlight() {
			const h = this.content?.activeItemHighlight
			return VALID_HIGHLIGHTS.includes(h) ? h : 'underline'
		},

		/**
		 * Whether the widget is in edit mode (empty-state gear clickable).
		 *
		 * @return {boolean} true when admin + canEdit.
		 */
		isInEditMode() {
			return this.isAdmin === true && this.canEdit === true
		},

		/**
		 * The root style/highlight/orientation CSS classes.
		 *
		 * @return {object} the class map.
		 */
		rootClasses() {
			return {
				[`cn-menu-widget--style-${this.effectiveStyle}`]: true,
				[`cn-menu-widget--highlight-${this.activeItemHighlight}`]: true,
				[`cn-menu-widget--orientation-${this.orientation}`]: true,
			}
		},

		/**
		 * The dotted-key path map for the current location.
		 *
		 * @return {{path: object, leafKey: string|null}} the active-path map.
		 */
		activePathMap() {
			return computeActivePath({
				items: this.items,
				currentLocation: this.currentLocation,
			})
		},

		/**
		 * The dotted-key → state map.
		 *
		 * @return {Record<string, string>} the path map.
		 */
		activePath() {
			return this.activePathMap.path
		},

		/**
		 * The key of the deepest active leaf.
		 *
		 * @return {string|null} the leaf key.
		 */
		activeLeafKey() {
			return this.activePathMap.leafKey
		},
	},

	mounted() {
		this.boundLocationListener = () => {
			this.currentLocation = this.readLocation()
		}
		if (typeof window !== 'undefined') {
			window.addEventListener('popstate', this.boundLocationListener)
			window.addEventListener('hashchange', this.boundLocationListener)
		}
		this.boundOutsideClickListener = this.onOutsideClick
		if (typeof document !== 'undefined') {
			document.addEventListener('click', this.boundOutsideClickListener)
		}
	},

	beforeUnmount() {
		if (typeof window !== 'undefined' && this.boundLocationListener) {
			window.removeEventListener('popstate', this.boundLocationListener)
			window.removeEventListener('hashchange', this.boundLocationListener)
		}
		if (typeof document !== 'undefined' && this.boundOutsideClickListener) {
			document.removeEventListener('click', this.boundOutsideClickListener)
		}
	},

	methods: {
		/**
		 * Read the current browser location into a small bag.
		 *
		 * @return {{pathname: string, host: string}} the location bag.
		 */
		readLocation() {
			if (typeof window === 'undefined' || !window.location) {
				return { pathname: '/', host: '' }
			}
			return {
				pathname: window.location.pathname || '/',
				host: window.location.host || '',
			}
		},

		/**
		 * Stash a top-level button ref by index.
		 *
		 * @param {HTMLElement} el the button element.
		 * @param {number} idx the item index.
		 * @return {void}
		 */
		setTopRef(el, idx) {
			if (el) {
				this.topRefs[idx] = el
			}
		},

		/**
		 * Stash a dropdown-style top-level `<li>` ref by index. This `<li>`
		 * contains both the toggle button and its dropdown/flyout panel, so a
		 * single containment check against it covers the whole open structure.
		 *
		 * @param {HTMLElement} el the `<li>` element.
		 * @param {number} idx the item index.
		 * @return {void}
		 */
		setBarItemRef(el, idx) {
			if (el) {
				this.barItemRefs[idx] = el
			}
		},

		/**
		 * Whether an item has children.
		 *
		 * @param {object} item the menu item.
		 * @return {boolean} true when it has a non-empty children array.
		 */
		hasChildren(item) {
			return item && Array.isArray(item.children) && item.children.length > 0
		},

		/**
		 * The active-state class for a dotted key.
		 *
		 * @param {string} key the dotted item key.
		 * @return {string} the class name (or `''`).
		 */
		topItemClass(key) {
			const state = this.activePath[key]
			if (state === 'active' || key === this.activeLeafKey) {
				return 'cn-menu-widget__item--active'
			}
			if (state === 'in-path') {
				return 'cn-menu-widget__item--in-path'
			}
			return ''
		},

		/**
		 * Top-level dropdown click — navigate a leaf or toggle the dropdown.
		 *
		 * @param {number} idx the item index.
		 * @param {object} item the menu item.
		 * @return {void}
		 */
		onDropdownTopClick(idx, item) {
			if (!this.hasChildren(item)) {
				this.onNavigate(item)
				return
			}
			if (this.dropOpenIndex === idx) {
				this.dropOpenIndex = null
				this.flyoutOpenKey = null
			} else {
				this.dropOpenIndex = idx
				this.flyoutOpenKey = null
			}
		},

		/**
		 * Open the dropdown at an index when it has children.
		 *
		 * @param {number} idx the item index.
		 * @return {void}
		 */
		openDropdown(idx) {
			if (this.hasChildren(this.items[idx])) {
				this.dropOpenIndex = idx
			}
		},

		/**
		 * Top-level megamenu click — navigate a leaf or toggle the panel.
		 *
		 * @param {number} idx the item index.
		 * @param {object} item the menu item.
		 * @return {void}
		 */
		onMegaTopClick(idx, item) {
			if (!this.hasChildren(item)) {
				this.onNavigate(item)
				return
			}
			this.megaOpenIndex = this.megaOpenIndex === idx ? null : idx
		},

		/**
		 * Keyboard handler for megamenu top items.
		 *
		 * @param {KeyboardEvent} event the key event.
		 * @param {number} idx the item index.
		 * @param {object} item the menu item.
		 * @return {void}
		 */
		onMegaTopKey(event, idx, item) {
			if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
				event.preventDefault()
				this.onMegaTopClick(idx, item)
			} else if (event.key === 'Tab') {
				this.megaOpenIndex = null
			}
		},

		/**
		 * Close every open dropdown/flyout/panel.
		 *
		 * @return {void}
		 */
		closeAll() {
			this.dropOpenIndex = null
			this.flyoutOpenKey = null
			this.megaOpenIndex = null
		},

		/**
		 * Document-level click handler — closes any open dropdown/flyout/panel
		 * when the click lands outside its own toggle button + panel, INCLUDING
		 * empty space elsewhere in the widget (e.g. bar padding, gaps between
		 * items) — not just outside the whole widget. The toggle button's own
		 * `@click` handler manages opening/closing for its own clicks, so a
		 * click still inside the open button/panel is left alone — otherwise
		 * every open-toggle click would immediately re-close itself via this
		 * same listener.
		 *
		 * @param {MouseEvent} event the document click event.
		 * @return {void}
		 */
		onOutsideClick(event) {
			const target = event.target
			if (this.effectiveStyle === 'megamenu') {
				if (this.megaOpenIndex === null) {
					return
				}
				const button = this.topRefs[this.megaOpenIndex]
				const panel = this.$refs.megaPanel
				const insideButton = Boolean(button && button.contains(target))
				const insidePanel = Boolean(panel && panel.contains(target))
				if (!insideButton && !insidePanel) {
					this.closeAll()
				}
				return
			}
			// Dropdown style — the button and its dropdown/flyout panel share
			// the same top-level `<li>`, so one containment check covers both.
			if (this.dropOpenIndex === null) {
				return
			}
			const barItem = this.barItemRefs[this.dropOpenIndex]
			if (barItem && !barItem.contains(target)) {
				this.closeAll()
			}
		},

		/**
		 * Navigate to an item's URL (router push for internal, new tab for
		 * external), closing any open menus first.
		 *
		 * @param {object} item the menu item.
		 * @return {void}
		 */
		onNavigate(item) {
			if (!item || typeof item.url !== 'string' || item.url === '') {
				return
			}
			this.closeAll()
			const url = item.url
			if (this.isExternal(url)) {
				if (typeof window !== 'undefined' && typeof window.open === 'function') {
					window.open(url, '_blank', 'noopener,noreferrer')
				}
				return
			}
			if (this.$router && typeof this.$router.push === 'function') {
				try {
					this.$router.push(url)
					return
				} catch (e) {
					// Fall through to location assignment.
				}
			}
			if (typeof window !== 'undefined' && window.location) {
				window.location.href = url
			}
		},

		/**
		 * Whether a URL is external (http/https).
		 *
		 * @param {string} url the URL.
		 * @return {boolean} true for absolute http(s) URLs.
		 */
		isExternal(url) {
			return typeof url === 'string' && /^https?:\/\//i.test(url)
		},

		/**
		 * Empty-state click — request edit when in edit mode.
		 *
		 * @return {void}
		 */
		onEmptyStateClick() {
			if (this.isInEditMode) {
				this.$emit('edit-request')
			}
		},

		/**
		 * Test helper — whether a URL is active for the current location.
		 *
		 * @param {string} itemUrl the URL to test.
		 * @return {boolean} true when active.
		 */
		__isActive(itemUrl) {
			return isActiveItem(itemUrl, this.currentLocation)
		},
	},
}
</script>

<style scoped>
.cn-menu-widget {
	width: 100%;
	height: 100%;
	padding: 4px;
	color: var(--color-main-text);
	font-size: 14px;
}

.cn-menu-widget__empty {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 16px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	border: 1px dashed var(--color-border);
	border-radius: var(--border-radius);
}

.cn-menu-widget__empty--clickable {
	cursor: pointer;
}

.cn-menu-widget__empty-icon {
	font-size: 18px;
}

.cn-menu-widget__bar {
	display: flex;
	flex-direction: row;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-menu-widget__bar--vertical {
	flex-direction: column;
}

.cn-menu-widget__bar-item {
	position: relative;
	list-style: none;
}

.cn-menu-widget__bar-button,
.cn-menu-widget__dropdown-item,
.cn-menu-widget__mega-group-title,
.cn-menu-widget__mega-leaf {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	background: transparent;
	border: none;
	border-radius: var(--border-radius);
	color: inherit;
	font-size: 14px;
	cursor: pointer;
	text-align: left;
	width: 100%;
}

.cn-menu-widget__mega-group-title {
	font-weight: 600;
}

.cn-menu-widget__bar-button:hover,
.cn-menu-widget__dropdown-item:hover,
.cn-menu-widget__mega-group-title:hover,
.cn-menu-widget__mega-leaf:hover {
	background: var(--color-background-hover);
}

.cn-menu-widget__bar-button:focus-visible,
.cn-menu-widget__dropdown-item:focus-visible {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

.cn-menu-widget__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
}

.cn-menu-widget__icon--hidden {
	visibility: hidden;
}

.cn-menu-widget__caret {
	margin-left: auto;
	font-size: 10px;
}

.cn-menu-widget__dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	z-index: 50;
	margin: 4px 0 0;
	padding: 4px;
	min-width: 180px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	list-style: none;
}

.cn-menu-widget__dropdown-item-wrap {
	position: relative;
}

.cn-menu-widget__flyout {
	position: absolute;
	top: 0;
	left: 100%;
	margin-left: 2px;
	padding: 4px;
	min-width: 160px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	list-style: none;
}

.cn-menu-widget__mega-panel {
	margin-top: 4px;
	padding: 12px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 12px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-menu-widget__mega-leaves {
	margin: 4px 0 0;
	padding: 0;
	list-style: none;
}

.cn-menu-widget__tree {
	margin: 0;
	padding: 0;
	list-style: none;
}

/* Active-item highlight variants. */
.cn-menu-widget--highlight-underline .cn-menu-widget__item--active {
	border-bottom: 3px solid var(--color-primary);
}

.cn-menu-widget--highlight-underline .cn-menu-widget__item--in-path {
	border-bottom: 2px solid var(--color-primary);
	opacity: 0.85;
}

.cn-menu-widget--highlight-background .cn-menu-widget__item--active,
.cn-menu-widget--highlight-background .cn-menu-widget__item--in-path {
	background: var(--color-primary-element-light, rgba(0, 112, 192, 0.1));
	color: var(--color-primary);
}

.cn-menu-widget--highlight-left-bar .cn-menu-widget__item--active {
	border-left: 5px solid var(--color-primary);
	padding-left: 6px;
}

.cn-menu-widget--highlight-left-bar .cn-menu-widget__item--in-path {
	border-left: 4px solid var(--color-primary);
	padding-left: 7px;
	opacity: 0.85;
}
</style>
