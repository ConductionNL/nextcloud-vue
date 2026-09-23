<template>
	<div class="cn-tabs" :class="{ 'cn-tabs--card': card }">
		<div class="cn-tabs__bar">
			<div
				class="cn-tabs__strip"
				:class="{ 'cn-tabs__strip--more-start': moreStart, 'cn-tabs__strip--more-end': moreEnd }">
				<div
					ref="nav"
					class="cn-tabs__nav"
					:class="{ 'cn-tabs__nav--justified': justified }"
					role="tablist"
					:aria-label="ariaLabel || null"
					@keydown="onNavKeydown"
					@wheel="onNavWheel"
					@scroll="measureOverflow">
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
				<!-- Mouse-only affordances: keyboard users already have the arrow
				     keys, and the tabs themselves stay in the accessibility tree. -->
				<button
					v-if="moreStart"
					type="button"
					class="cn-tabs__scroll cn-tabs__scroll--start"
					aria-hidden="true"
					tabindex="-1"
					@click="scrollStrip(-1)">
					<ChevronLeft :size="20" />
				</button>
				<button
					v-if="moreEnd"
					type="button"
					class="cn-tabs__scroll cn-tabs__scroll--end"
					aria-hidden="true"
					tabindex="-1"
					@click="scrollStrip(1)">
					<ChevronRight :size="20" />
				</button>
			</div>
			<div v-if="$slots['nav-end']" class="cn-tabs__nav-end">
				<!-- @slot nav-end Rendered at the right-hand end of the tab bar, deliberately OUTSIDE the `role="tablist"` element. A widget Actions menu belongs beside the strip, not inside it: anything nested in the tablist is announced as one of the tabs, so a screen-reader user counting six tabs would hear seven. -->
				<!-- @binding {number} active-index Index of the currently selected tab. -->
				<slot name="nav-end" :activeIndex="activeIndex" />
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
import { computed, defineComponent, onBeforeUnmount, onMounted, onUpdated, provide, reactive, ref, watch } from 'vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import { CN_TABS_INJECTION_KEY } from './tabsKey.js'

export default defineComponent({
	name: 'CnTabs',

	components: {
		ChevronLeft,
		ChevronRight,
	},

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

		const nav = ref(null)

		/**
		 * Scroll the strip so the selected tab is wholly in view.
		 *
		 * @return {void}
		 */
		function revealActiveTab() {
			const strip = nav.value
			const button = strip?.querySelector('[role="tab"][aria-selected="true"]')
			if (!strip || !button) {
				return
			}
			const stripRect = strip.getBoundingClientRect()
			const rect = button.getBoundingClientRect()
			if (rect.left < stripRect.left) {
				strip.scrollLeft -= stripRect.left - rect.left
			} else if (rect.right > stripRect.right) {
				strip.scrollLeft += rect.right - stripRect.right
			}
		}

		watch(activeUid, revealActiveTab, { flush: 'post' })

		// Whether tabs are hidden past the start or end edge of the strip.
		const moreStart = ref(false)
		const moreEnd = ref(false)

		/**
		 * Recompute which edges hide tabs; 1px of tolerance absorbs sub-pixel rounding.
		 *
		 * @return {void}
		 */
		function measureOverflow() {
			const strip = nav.value
			if (!strip) {
				return
			}
			moreStart.value = strip.scrollLeft > 1
			moreEnd.value = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 1
		}

		let resizeObserver = null

		onMounted(() => {
			measureOverflow()
			if (typeof ResizeObserver === 'undefined' || !nav.value) {
				return
			}
			resizeObserver = new ResizeObserver(measureOverflow)
			resizeObserver.observe(nav.value)
		})

		// A title change or a tab added can tip the strip into overflowing without resizing it.
		onUpdated(measureOverflow)

		onBeforeUnmount(() => {
			resizeObserver?.disconnect()
			resizeObserver = null
		})

		/**
		 * Scroll the strip most of a viewport towards one edge.
		 *
		 * @param {number} direction -1 towards the start, 1 towards the end.
		 *
		 * @return {void}
		 */
		function scrollStrip(direction) {
			const strip = nav.value
			if (!strip) {
				return
			}
			strip.scrollLeft += direction * Math.max(1, Math.round(strip.clientWidth * 0.6))
		}

		/**
		 * Turn a vertical wheel into a horizontal scroll while the strip overflows.
		 *
		 * @param {WheelEvent} event The wheel event.
		 *
		 * @return {void}
		 */
		function onNavWheel(event) {
			const strip = event.currentTarget
			if (strip.scrollWidth <= strip.clientWidth || event.deltaX !== 0 || event.deltaY === 0) {
				return
			}
			event.preventDefault()
			strip.scrollLeft += event.deltaY
		}

		provide(CN_TABS_INJECTION_KEY, { register, unregister, select, isActive })

		return {
			tabs,
			isActive,
			activeIndex,
			nav,
			navButtons,
			moreStart,
			moreEnd,
			measureOverflow,
			scrollStrip,
			onNavKeydown,
			onNavWheel,
		}
	},
})
</script>

<style scoped>
/* The bar owns the rule under the strip so a `#nav-end` surface sits ON the
   line rather than above a line that stops where the last tab does. With no
   nav-end content the nav is the bar's only child and the result is pixel
   identical to the rule living on the nav itself. */
.cn-tabs__bar {
	/* Top-aligned so the `#nav-end` control sits on the tab row, not below it,
	   should the two sides ever differ in height. */
	align-items: flex-start;
	border-bottom: 1px solid var(--color-border);
	display: flex;
	gap: 8px;
}

/* The strip holds the scrolling nav and the edge affordances drawn over it. */
.cn-tabs__strip {
	flex: 1 1 auto;
	min-width: 0;
	position: relative;
}

.cn-tabs__nav {
	display: flex;
	gap: 4px;
	/* One row that scrolls, never a wrap: in a narrow sidebar a nine-tab strip
	   wrapped into a stack taller than the panel under it. The scrollbar is
	   hidden because it would sit between the tabs and the bar's rule and break
	   the open tab's join with its panel; a fade and a chevron on the clipped
	   edge say there is more, and the strip follows the wheel. */
	flex-wrap: nowrap;
	overflow-x: auto;
	overflow-y: hidden;
	scroll-behavior: smooth;
	scrollbar-width: none;
	/* Overhang the bar's 1px rule so the open tab's own bottom edge, drawn in
	   the panel's colour, covers it and the tab joins its panel. */
	margin-bottom: -1px;
}

.cn-tabs__nav::-webkit-scrollbar {
	display: none;
}

@media (prefers-reduced-motion: reduce) {
	.cn-tabs__nav {
		scroll-behavior: auto;
	}
}

/* A fade over the clipped edge, only on the side that hides tabs. Stops a
   pixel above the bar's rule so the rule keeps its full colour. */
.cn-tabs__strip::before,
.cn-tabs__strip::after {
	content: '';
	display: none;
	inset-block: 0 1px;
	pointer-events: none;
	position: absolute;
	width: 56px;
	z-index: 1;
}

.cn-tabs__strip::before {
	background: linear-gradient(to right, var(--color-main-background) 30%, transparent);
	inset-inline-start: 0;
}

.cn-tabs__strip::after {
	background: linear-gradient(to left, var(--color-main-background) 30%, transparent);
	inset-inline-end: 0;
}

.cn-tabs__strip--more-start::before,
.cn-tabs__strip--more-end::after {
	display: block;
}

/* Doubled selector for the same reason as `.cn-tabs__nav .cn-tabs__nav-item`:
   Nextcloud's own `button` rule would otherwise give this a border, a fill
   and a margin. */
.cn-tabs__strip .cn-tabs__scroll {
	align-items: center;
	background: none;
	border: 0;
	border-radius: 0;
	color: var(--color-main-text);
	cursor: pointer;
	display: flex;
	/* Pushed down a little so the chevron sits level with the tab labels. */
	inset-block: 2px 0;
	justify-content: center;
	margin: 0;
	min-height: 0;
	padding: 0;
	position: absolute;
	width: 28px;
	z-index: 2;
}

/* Nextcloud's `button:hover` rule would otherwise fill the chevron. */
.cn-tabs__strip .cn-tabs__scroll:hover,
.cn-tabs__strip .cn-tabs__scroll:focus {
	background: none;
}

.cn-tabs__scroll--start {
	inset-inline-start: 0;
}

.cn-tabs__scroll--end {
	inset-inline-end: 0;
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

/* Nextcloud's server stylesheet gives every plain `button` a 3px bottom margin
   with a selector that outscores the scoped rule above, which floated the tabs
   above the bar's rule inside a real page. The parent class wins on
   specificity rather than on `!important` or source order. */
.cn-tabs__nav .cn-tabs__nav-item {
	margin-block-end: 0;
}

.cn-tabs__nav--justified .cn-tabs__nav-item {
	flex: 1 1 0;
}

.cn-tabs__nav-item:hover,
.cn-tabs__nav-item:focus-visible {
	background-color: var(--color-background-hover);
	color: var(--color-main-text);
}

/* Inside the box: the scrolling strip clips anything drawn outside a tab. */
.cn-tabs__nav-item:focus-visible {
	outline-offset: -2px;
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
