<template>
	<div class="cn-tabs" :class="{ 'cn-tabs--card': card }">
		<div class="cn-tabs__bar">
			<!-- Pointer-only scroll affordances, rendered only when the strip
			     actually overflows. `aria-hidden` + `tabindex="-1"` on purpose:
			     a keyboard user reaches every tab with Left/Right, which moves
			     focus and therefore scrolls the tab into view, so these would
			     add two stops to the tab order and two announcements to a strip
			     whose whole job is to be countable. -->
			<button
				v-if="hasOverflow"
				type="button"
				class="cn-tabs__scroll cn-tabs__scroll--start"
				aria-hidden="true"
				tabindex="-1"
				:disabled="!canScrollStart"
				@click="scrollStrip(-1)">
				‹
			</button>
			<div
				ref="navEl"
				class="cn-tabs__nav"
				:class="{ 'cn-tabs__nav--justified': justified }"
				role="tablist"
				:aria-label="ariaLabel || null"
				@scroll="updateScrollState"
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
					<span class="cn-tabs__nav-item-label"><component :is="tab.titleRender" /></span>
				</button>
			</div>
			<button
				v-if="hasOverflow"
				type="button"
				class="cn-tabs__scroll cn-tabs__scroll--end"
				aria-hidden="true"
				tabindex="-1"
				:disabled="!canScrollEnd"
				@click="scrollStrip(1)">
				›
			</button>
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
 * ## The strip is one line
 *
 * Tabs share a single row whatever their number. They shrink to a readable
 * floor first, so a strip that is only modestly over the width it has been
 * given simply fits; past that floor the row scrolls, with a button at each
 * end while there is anything to scroll to.
 *
 * It used to wrap instead, on the reasoning that a scrolling strip hides tabs
 * behind an edge with nothing to say they are there. The reasoning was right
 * and the remedy was wrong: `white-space: nowrap` makes a tab's min-content
 * width its whole label, so the tabs could not shrink and the strip answered
 * every shortfall with another row — six short tabs took three rows of a
 * dossiq case panel, and cutting that strip from fourteen tabs to six changed
 * nothing. The scroll buttons answer the objection that made wrapping look
 * like the safer option.
 *
 * The buttons are `aria-hidden` and out of the tab order on purpose. Every tab
 * is already reachable with Left/Right/Home/End, which moves focus and brings
 * the target into view, so a keyboard user needs nothing here — and two extra
 * stops in a strip whose job is to be countable would be a cost with no
 * matching benefit.
 *
 * ## Accessibility
 *
 * Implements the WAI-ARIA tabs pattern: `role="tablist"` / `role="tab"` /
 * `role="tabpanel"`, `aria-selected`, `aria-controls` ↔ `aria-labelledby`
 * wiring, a roving `tabindex` (only the selected tab is in the tab order), and
 * Left/Right/Home/End keyboard navigation within the strip. Pass `aria-label`
 * (or `ariaLabel`) so screen-reader users hear what the strip is for.
 */
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
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
		const navEl = ref(null)
		// Whether the strip overflows at all. BOTH affordances render together
		// on the strength of it, each disabled when it has nothing to do,
		// rather than each appearing when its own direction becomes available.
		// They sit in the bar's flex row, so a button that appears mid-scroll
		// narrows the strip under the scroll that is running: measured on a
		// 14-tab strip, pressing End landed the last tab 22px — the button's
		// exact width — short of its own right edge and stopped there. Showing
		// both from the start keeps the strip's width constant while it moves.
		// This cannot oscillate: rendering the buttons only ever makes the
		// strip narrower, so a strip that overflows keeps overflowing.
		const hasOverflow = ref(false)
		const canScrollStart = ref(false)
		const canScrollEnd = ref(false)
		let resizeObserver = null

		/**
		 * Recompute whether the strip overflows, and in which direction.
		 *
		 * A 1px tolerance because a fractional layout (a 33.5px tab, a zoomed
		 * page) leaves `scrollWidth` a hair above `clientWidth` on a strip that
		 * visually fits, and a scroll button on a strip with nothing to scroll
		 * to is worse than none.
		 *
		 * @return {void}
		 */
		function updateScrollState() {
			const el = navEl.value
			if (!el) {
				hasOverflow.value = false
				canScrollStart.value = false
				canScrollEnd.value = false
				return
			}
			hasOverflow.value = el.scrollWidth > el.clientWidth + 1
			canScrollStart.value = el.scrollLeft > 1
			canScrollEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
		}

		/**
		 * Bring one nav button fully inside the strip, by the smallest scroll
		 * that does it. Nothing happens when it is already whole.
		 *
		 * @param {HTMLElement} button The nav button to reveal.
		 *
		 * @return {void}
		 */
		function revealTab(button) {
			const el = navEl.value
			if (!el || !button || typeof el.scrollBy !== 'function') {
				return
			}
			const tab = button.getBoundingClientRect()
			const strip = el.getBoundingClientRect()
			if (tab.left < strip.left) {
				el.scrollBy({ left: tab.left - strip.left, behavior: 'smooth' })
			} else if (tab.right > strip.right) {
				el.scrollBy({ left: tab.right - strip.right, behavior: 'smooth' })
			}
		}

		/**
		 * Scroll the strip by most of a viewport, leaving a sliver of the tab
		 * that was at the edge so the movement reads as a scroll rather than a
		 * page change.
		 *
		 * @param {number} direction -1 for start, 1 for end.
		 *
		 * @return {void}
		 */
		function scrollStrip(direction) {
			const el = navEl.value
			if (!el) {
				return
			}
			el.scrollBy({ left: direction * Math.max(80, el.clientWidth * 0.8), behavior: 'smooth' })
		}

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
				// `preventScroll`, then scroll the strip by hand. The browser's
				// own focus scroll and `scrollIntoView()` both animate, and two
				// smooth scrolls issued in the same tick fight: measured, the
				// last tab of a 14-tab strip settled 22px short of its own
				// right edge and stayed there. One deterministic scroll, by the
				// exact overhang, lands it every time.
				button.focus({ preventScroll: true })
				revealTab(button)
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

		onMounted(() => {
			updateScrollState()
			if (typeof ResizeObserver !== 'undefined' && navEl.value) {
				resizeObserver = new ResizeObserver(() => updateScrollState())
				resizeObserver.observe(navEl.value)
			}
		})

		onBeforeUnmount(() => {
			if (resizeObserver) {
				resizeObserver.disconnect()
				resizeObserver = null
			}
		})

		// A tab registering or unmounting changes the strip's width without
		// resizing the nav, so the ResizeObserver alone would miss it.
		watch(() => tabs.length, () => { nextTick(updateScrollState) })

		return {
			tabs,
			isActive,
			activeIndex,
			navButtons,
			navEl,
			hasOverflow,
			canScrollStart,
			canScrollEnd,
			updateScrollState,
			scrollStrip,
			onNavKeydown,
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
	/* flex-START, not flex-end. Kept from when the nav could grow taller than
	   its sibling: it no longer wraps, but the `#nav-end` control is still the
	   taller side on some hosts and bottom-aligning would then push the tabs
	   down off the bar's rule. */
	align-items: flex-start;
	border-bottom: 1px solid var(--color-border);
	display: flex;
	gap: 8px;
}

/* THE STRIP IS ONE LINE.
   It used to wrap, on the reasoning that a scrolling strip hides tabs behind
   an edge with nothing to say they are there. The reasoning was right and the
   remedy was wrong: `white-space: nowrap` on a tab makes its min-content width
   its whole label, so a flex item that is nominally shrinkable cannot actually
   shrink, and the strip had no way to respond to the space it was given. It
   answered every shortfall the only way left to it — another row.
   Measured on a dossiq case panel, which is an 8-of-12 detail-grid cell and so
   440px wide at a 1024 viewport, leaving a 317px strip: SIX short tabs took
   THREE rows, and cutting the strip from fourteen tabs to six moved nothing,
   because the first five sat at byte-identical positions either way. A tab
   strip that is a third of a card's height is not a strip.
   So: one line, tabs that shrink to a readable floor, and past that a scroll —
   with the two buttons in the template answering the objection that made
   wrapping look like the safer option. */
.cn-tabs__nav {
	display: flex;
	flex: 1 1 auto;
	gap: 4px;
	min-width: 0;
	flex-wrap: nowrap;
	overflow-x: auto;
	/* `hidden`, not `visible`: `overflow-x: auto` forces the other axis to a
	   scrolling value anyway, and `auto` there would add a vertical scrollbar
	   to a 34px box. */
	overflow-y: hidden;
	scroll-behavior: smooth;
	/* No scrollbar: the two buttons carry the affordance, and a scrollbar under
	   a 34px strip is a second control saying the same thing.
	   NOT VERIFIED AS A LAYOUT FIX. A classic (non-overlay) scrollbar is part
	   of the box and would make the nav taller whenever the strip overflowed,
	   sinking the bar's rule and breaking the join between the open tab and its
	   panel — but this repo's Chromium renders overlay scrollbars, so leaving
	   `scrollbar-width: auto` in place did not reproduce that and no test here
	   can hold it. Stated as the reason to keep the declaration, not as a
	   measured one. */
	scrollbar-width: none;
	/* The active tab's `margin-bottom: -1px` overhang lies outside the content
	   box, so `overflow-y: hidden` would clip the very pixel that covers the
	   bar's rule. One pixel of padding puts it back inside the padding box
	   (which is what overflow clips at), and the matching negative margin keeps
	   the nav's outer box exactly where it was. */
	padding-bottom: 1px;
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

/* Rendered as a pair while the strip overflows; each disabled at its own end. */
.cn-tabs__scroll {
	align-items: center;
	align-self: stretch;
	background: transparent;
	border: none;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
	display: flex;
	flex: 0 0 auto;
	font-size: 18px;
	line-height: 1;
	margin: 0;
	min-height: 0;
	padding: 0 4px;
}

.cn-tabs__scroll:hover:not([disabled]) {
	color: var(--color-main-text);
}

.cn-tabs__scroll[disabled] {
	cursor: default;
	opacity: 0.35;
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
	/* See `.cn-tabs__nav .cn-tabs__nav-item` below for why this alone is not
	   enough inside a Nextcloud page. */
	padding: 8px 12px;
	white-space: nowrap;
	/* Shrinkable, with a floor. `min-width: auto` on a flex item resolves to
	   its min-content width, which for nowrap text is the whole label — that is
	   what stopped these responding to available space at all. The floor is
	   what stops the other extreme: a strip squeezed to nothing per tab, which
	   is a row of ellipses and names no panel. Past the floor the strip
	   scrolls.
	   Shrink is proportional to natural width, so the long label gives way
	   first and the short ones keep their text — which is the right order.
	   The floor is set just above the natural width of a one-word tab, so a
	   strip of short tabs is barely distorted by it. The cap stops the other
	   direction: one long label must not take a third of the strip. */
	flex: 0 1 auto;
	min-width: 5.5rem;
	max-width: 16rem;
	overflow: hidden;
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

/* Nextcloud's server stylesheet sets `margin-bottom: 3px` on every plain
   `button`, and its selector
   `button:not(.button-vue, [class^="vs__"]):not(.app-navigation-entry-button)`
   scores (0,2,1) against the (0,2,0) of the scoped rule above. So inside a real
   Nextcloud page the tabs sat 4px ABOVE the bar's rule and the open tab never
   met its panel: the join this whole treatment is built on was only ever
   visible outside the app.
   Measured on a running instance, not inferred: the e2e harness is a bare vite
   page that does not load Nextcloud's CSS, so it cannot see this conflict and
   reported the gap as 1px while the app showed 5px.
   Adding the parent class takes the selector to (0,3,0), which wins on
   specificity rather than on `!important` or source order. */
.cn-tabs__nav .cn-tabs__nav-item {
	margin-bottom: -1px;
}

.cn-tabs__nav--justified .cn-tabs__nav-item {
	flex: 1 1 0;
}

/* The label truncates rather than being cut mid-glyph. The `#title` slot may
   render an icon beside the text (CnTabsWidget does), so the ellipsis lives on
   the inner text there; this covers the plain-string `title` case. */
.cn-tabs__nav-item-label {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
