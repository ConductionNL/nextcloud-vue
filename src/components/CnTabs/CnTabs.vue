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
	/* No min-height. This used to hard-code 38px to mirror the old nav item's
	   vertical box, but the folder-tab restyle changed that box to 33px, and
	   because the bar is `align-items: flex-start` the taller nav-end then drove
	   the BAR's height. The bar's bottom rule sank 6px below the tab row, so the
	   open tab no longer met the panel it is drawn as joined to. Letting the
	   control size to its own content keeps the rule on the tab row whatever the
	   nav item's box becomes, so the two cannot drift apart again. */
	min-height: 0;
}

/* Folder tabs, not underlined labels. An underline is the weakest possible
   affordance on a strip that already carries icons: with nine tabs on a dossiq
   case the row read as a sentence of links, and only the 2px rule said which
   one was open. Giving the inactive tabs their own darker surface makes the
   strip legible as a control at a glance, and the active tab, sharing the
   panel's background and punching a hole in the bar's rule, reads as the sheet
   in front. */
.cn-tabs__nav-item {
	background-color: var(--color-background-dark);
	/* `--color-border-dark`, not `--color-border`: the latter is the same
	   #ededed as `--color-background-dark` in the stock light theme, so a tab
	   drawn with it has no visible edge against its own fill. */
	border: 1px solid var(--color-border-dark);
	border-bottom: none;
	border-radius: var(--border-radius-large, 8px) var(--border-radius-large, 8px) 0 0;
	/* Full-contrast label, not `--color-text-maxcontrast`. On the old
	   transparent strip maxcontrast sat on white at 5.3:1; on this darker
	   surface the same pair measures 4.55:1, which clears WCAG AA by 0.05 and
	   would not survive a themed instance shifting either token. A real tab
	   strip carries its selection in the surface and the weight anyway, so
	   nothing is lost by giving every label the readable colour. */
	color: var(--color-main-text);
	cursor: pointer;
	font-weight: normal;
	/* Overlap the bar's 1px rule so the active tab's own bottom edge can cover
	   it. Harmless on a wrapped second row: the 4px nav gap absorbs it. */
	margin-bottom: -1px;
	padding: 8px 12px;
	white-space: nowrap;
	/* Match the `#nav-end` control's own height. The bar is a flex row, so
	   whichever side is taller sets the bar's height and therefore where its
	   bottom rule lands. When the control was the taller one the rule sat below
	   the tab row and showed as a line under the open tab, breaking the join to
	   the panel. Sizing both sides the same is what keeps the rule ON the tab
	   row; `inline-flex` centres the label inside the taller box. */
	align-items: center;
	box-sizing: border-box;
	display: inline-flex;
	min-height: var(--default-clickable-area, 34px);
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
	background-color: var(--color-background-dark);
	color: var(--color-main-text);
}

/* The open tab: the panel's own background, and a bottom border painted in
   that same background so it erases the bar's rule underneath and the tab
   joins the sheet below it. The primary-coloured top edge is what carries the
   selection at a glance, and it survives forced-colours mode, which drops
   background colours but keeps borders. */
.cn-tabs__nav-item--active {
	background-color: var(--color-main-background);
	border-bottom: 1px solid var(--color-main-background);
	border-top: 2px solid var(--color-primary-element);
	color: var(--color-main-text);
	font-weight: bold;
	/* Keep the text baseline identical to an inactive tab despite the 1px
	   thicker top border, so the strip does not jog when the selection moves. */
	padding-top: 7px;
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
