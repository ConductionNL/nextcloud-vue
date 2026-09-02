<template>
	<div class="cn-tabs" :class="{ 'cn-tabs--card': card }">
		<div class="cn-tabs__bar">
			<div
				class="cn-tabs__nav"
				:class="{ 'cn-tabs__nav--justified': justified }"
				role="tablist"
				:aria-label="ariaLabel || null"
				@keydown="onNavKeydown">
				<button
					v-for="tab in tabs"
					:id="tab.tabId"
					:key="tab.uid"
					ref="navButtons"
					type="button"
					role="tab"
					class="cn-tabs__nav-item"
					:class="{ 'cn-tabs__nav-item--active': isActive(tab.uid) }"
					:aria-selected="isActive(tab.uid) ? 'true' : 'false'"
					:aria-controls="tab.panelId"
					:tabindex="isActive(tab.uid) ? 0 : -1"
					:disabled="tab.disabled || null"
					@click="tab.onActivate()">
					<component :is="tab.titleRender" />
				</button>
			</div>
			<div v-if="$slots['nav-end']" class="cn-tabs__nav-end">
				<!-- @slot nav-end Rendered at the right-hand end of the tab bar, deliberately OUTSIDE the `role="tablist"` element. A widget Actions menu belongs beside the strip, not inside it: anything nested in the tablist is announced as one of the tabs, so a screen-reader user counting six tabs would hear seven. -->
				<!-- @binding {number} active-index Index of the currently selected tab. -->
				<slot name="nav-end" :active-index="activeIndex" />
			</div>
		</div>
		<div class="cn-tabs__content" :class="contentClass">
			<!-- @slot The CnTab children. Anything else is rendered into the panel area untouched. -->
			<slot />
		</div>
	</div>
</template>

<script>
/**
 * CnTabs — a generic tab strip.
 *
 * Neither `@nextcloud/vue@9` nor this library previously shipped one: the only
 * tab component in either is `NcAppSidebarTab`, which is meaningless outside an
 * `NcAppSidebar`. Apps that needed a plain tab strip in a page, a dialog or a
 * detail view were on `bootstrap-vue@2` — a Vue-2-only package with no Vue 3
 * release (`bootstrap-vue-next` is a different package with a different API) —
 * and pulling a second UI framework in alongside `@nextcloud/vue` cuts against
 * the fleet rule that apps render with Nextcloud components. So zaakafhandelapp
 * wrote a local `Tabs`/`Tab` pair for eight views and opencatalogi and
 * openregister flagged the same gap. This is that pair, lifted and hardened.
 *
 * ```vue
 * <CnTabs aria-label="Case details" justified>
 *   <CnTab title="Documents">…</CnTab>
 *   <CnTab title="Tasks" :active="showTasks" @click="onTasks">…</CnTab>
 *   <CnTab>
 *     <template #title><CnIcon name="close" /> Draft</template>
 *     …
 *   </CnTab>
 * </CnTabs>
 * ```
 *
 * ## Putting controls beside the strip
 *
 * `#nav-end` fills the right-hand end of the tab bar. `CnTabsWidget` uses it to
 * carry the active child's Actions menu, so one menu serves every tab instead
 * of each panel drawing its own header:
 *
 * ```vue
 * <CnTabs aria-label="Case details">
 *   <template #nav-end><CnActionsMenu :title="activeTitle" /></template>
 *   <CnTab title="Notes">…</CnTab>
 * </CnTabs>
 * ```
 *
 * The slot renders OUTSIDE the `role="tablist"` element on purpose. See the
 * comment on it in the template.
 *
 * ## Migrating from `bootstrap-vue`
 *
 * `<BTabs>`/`<BTab>` map across directly for the subset apps actually used:
 * `content-class`, `justified` and `card` on the strip; `title`, the `#title`
 * slot, `active` and `@click` on a tab. Anything else (`lazy`, `no-fade`,
 * `pills`, `<b-tab disabled>`'s tooltip behaviour) is not reimplemented.
 *
 * ## How registration works
 *
 * Children register themselves on mount and hand back a *render function* for
 * their title rather than a plain string. That is what lets a child's `#title`
 * slot be rendered inside the parent's nav strip, and it keeps a computed title
 * reactive: the parent invokes it inside its own render effect, so a title
 * change re-renders the nav.
 *
 * Mount order is document order for both static children and `v-for`-generated
 * ones, so the nav strip matches the source. A tab that unmounts (a closable
 * tab) hands the selection to its neighbour.
 *
 * ## Accessibility
 *
 * Implements the WAI-ARIA tabs pattern: `role="tablist"` / `role="tab"` /
 * `role="tabpanel"`, `aria-selected`, `aria-controls` ↔ `aria-labelledby`
 * wiring, a roving `tabindex` (only the selected tab is in the tab order), and
 * Left/Right/Home/End keyboard navigation within the strip. Pass `aria-label`
 * (or `ariaLabel`) so screen-reader users hear what the strip is for.
 */
import { computed, defineComponent, provide, reactive, ref } from 'vue'
import { CN_TABS_INJECTION_KEY } from './tabsKey.js'

export default defineComponent({
	name: 'CnTabs',

	props: {
		/** Extra class applied to the panel container (bootstrap-vue's `content-class`). */
		contentClass: {
			type: String,
			default: '',
		},
		/** Stretch the nav items to fill the strip (bootstrap-vue's `justified`). */
		justified: {
			type: Boolean,
			default: false,
		},
		/** Card-style chrome (border + padding) around the panel area. */
		card: {
			type: Boolean,
			default: false,
		},
		/**
		 * Accessible name for the tab strip, applied to the `role="tablist"`
		 * element. Screen readers announce it when focus enters the strip.
		 */
		ariaLabel: {
			type: String,
			default: '',
		},
	},

	emits: [
		/** The selected tab changed. Payload: the new active tab's index. */
		'update:activeIndex',
	],

	setup(props, { emit }) {
		// Registered children, in mount order.
		const tabs = reactive([])
		const activeUid = ref(null)
		const navButtons = ref([])

		/**
		 * Register a child tab. The first child to register wins the initial
		 * selection unless a later one declares itself `active`. Disabled tabs
		 * never take the initial selection.
		 *
		 * @param {object} tab Child descriptor.
		 *
		 * @return {void}
		 */
		function register(tab) {
			tabs.push(tab)
			if (tab.disabled) {
				return
			}
			if (activeUid.value === null || tab.active) {
				activeUid.value = tab.uid
			}
		}

		/**
		 * Drop a child that is unmounting, moving the selection to its nearest
		 * remaining neighbour when it was the active one. Closable tabs rely on
		 * this; without it the strip would render with nothing selected.
		 *
		 * @param {number} uid The child's instance uid.
		 *
		 * @return {void}
		 */
		function unregister(uid) {
			const index = tabs.findIndex((tab) => tab.uid === uid)
			if (index !== -1) {
				tabs.splice(index, 1)
			}
			if (activeUid.value === uid) {
				const neighbour = tabs[index] || tabs[index - 1] || tabs[0] || null
				activeUid.value = neighbour ? neighbour.uid : null
			}
		}

		/**
		 * Make a child the visible one.
		 *
		 * @param {number} uid The child's instance uid.
		 *
		 * @return {void}
		 */
		function select(uid) {
			if (activeUid.value === uid) {
				return
			}
			activeUid.value = uid
			emit('update:activeIndex', tabs.findIndex((tab) => tab.uid === uid))
		}

		/**
		 * Whether a child is the visible one.
		 *
		 * @param {number} uid The child's instance uid.
		 *
		 * @return {boolean} True when this tab's panel should render.
		 */
		function isActive(uid) {
			return activeUid.value === uid
		}

		const activeIndex = computed(() => tabs.findIndex((tab) => tab.uid === activeUid.value))

		/**
		 * Move the selection and DOM focus to a tab by index, skipping disabled
		 * ones. Focus has to move with the selection: in the WAI-ARIA tabs
		 * pattern only the selected tab is in the tab order, so leaving focus on
		 * a now-`tabindex="-1"` button strands the keyboard user.
		 *
		 * @param {number} index Target index (clamped to the enabled tabs).
		 *
		 * @return {void}
		 */
		function focusTab(index) {
			const enabled = tabs.filter((tab) => !tab.disabled)
			if (enabled.length === 0) {
				return
			}
			const wrapped = ((index % enabled.length) + enabled.length) % enabled.length
			const target = enabled[wrapped]
			select(target.uid)
			const position = tabs.indexOf(target)
			const button = navButtons.value?.[position]
			if (button && typeof button.focus === 'function') {
				button.focus()
			}
		}

		/**
		 * Left/Right/Home/End navigation inside the strip.
		 *
		 * @param {KeyboardEvent} event The keydown event.
		 *
		 * @return {void}
		 */
		function onNavKeydown(event) {
			const enabled = tabs.filter((tab) => !tab.disabled)
			const current = enabled.findIndex((tab) => tab.uid === activeUid.value)
			let next = null

			if (event.key === 'ArrowRight') {
				next = current + 1
			} else if (event.key === 'ArrowLeft') {
				next = current - 1
			} else if (event.key === 'Home') {
				next = 0
			} else if (event.key === 'End') {
				next = enabled.length - 1
			}

			if (next === null) {
				return
			}
			event.preventDefault()
			focusTab(next)
		}

		provide(CN_TABS_INJECTION_KEY, { register, unregister, select, isActive })

		return { tabs, isActive, activeIndex, navButtons, onNavKeydown }
	},
})
</script>

<style scoped>
/* The bar owns the rule under the strip so a `#nav-end` surface sits ON the
   line rather than above a line that stops where the last tab does. With no
   nav-end content the nav is the bar's only child and the result is pixel
   identical to the rule living on the nav itself. */
.cn-tabs__bar {
	/* flex-START, not flex-end. The nav is a SIBLING that grows taller when its
	   tabs wrap, so bottom-aligning drops the `#nav-end` control down beside
	   the LAST row. Measured on a 9-tab dossiq case strip: Actions landed next
	   to the single wrapped tab and read as that one tab's own control rather
	   than the strip's. Top-aligning keeps it on the first row, where the
	   widget's title used to be. */
	align-items: flex-start;
	border-bottom: 1px solid var(--color-border);
	display: flex;
	gap: 8px;
}

.cn-tabs__nav {
	display: flex;
	flex: 1 1 auto;
	gap: 4px;
	min-width: 0;
	/* Wrap before scrolling. A horizontally scrolling strip hides tabs behind
	   an edge with nothing to say they are there, and beside a `#nav-end`
	   control the clipped tab reads as sitting UNDER the control. Wrapping
	   keeps every tab reachable without a gesture. */
	flex-wrap: wrap;
}

.cn-tabs__nav-end {
	align-items: center;
	display: flex;
	flex: 0 0 auto;
	gap: 4px;
	/* Mirror a nav item's vertical box (8px padding top and bottom, plus the
	   2px active underline) so the control centres against the FIRST row of
	   tabs instead of hugging the top edge when the strip is one row. */
	min-height: 38px;
}

.cn-tabs__nav-item {
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	border-radius: 0;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
	font-weight: normal;
	padding: 8px 12px;
	white-space: nowrap;
}

.cn-tabs__nav--justified .cn-tabs__nav-item {
	flex: 1 1 0;
}

.cn-tabs__nav-item:hover,
.cn-tabs__nav-item:focus-visible {
	background-color: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-tabs__nav-item[disabled] {
	cursor: default;
	opacity: 0.5;
}

.cn-tabs__nav-item[disabled]:hover {
	background-color: transparent;
	color: var(--color-text-maxcontrast);
}

.cn-tabs__nav-item--active {
	border-bottom-color: var(--color-primary-element);
	color: var(--color-main-text);
	font-weight: bold;
}

.cn-tabs__content {
	padding-top: 12px;
}

.cn-tabs--card .cn-tabs__content {
	border: 1px solid var(--color-border);
	border-top: none;
	padding: 12px;
}
</style>
