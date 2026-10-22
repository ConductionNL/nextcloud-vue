<!--
  CnDashboardGrid — GridStack-powered drag-and-drop dashboard grid.

  Renders widgets in a configurable grid layout. Supports drag, resize,
  and dynamic item addition/removal. Emits layout changes for persistence.

  Accessibility: every grid item is an ARIA `group` with an accessible name
  and — in edit mode — a tab stop, so the pointer-only GridStack drag/resize
  gestures have a full keyboard equivalent (WCAG 2.1 SC 2.1.1). Keyboard
  moves are routed through `GridStack.update()`, i.e. the exact same engine
  call drag/resize ends in, so collision handling, persistence and the
  `layout-change` emission are byte-identical between the two input modes.
-->
<template>
	<div ref="gridContainer"
		class="cn-dashboard-grid"
		:class="{ 'cn-dashboard-grid--side-column': sideColumnStyle !== null }"
		:style="sideColumnStyle">
		<!--
			Keyboard instructions, referenced by every grid item through
			`aria-describedby`. Rendered once (not per item) so a screen
			reader user hears the key map on the first item they land on
			without it being duplicated N times in the accessibility tree.
		-->
		<p
			v-if="keyboardActive"
			:id="keyboardHelpDomId"
			class="cn-dashboard-grid__sr-only">
			{{ keyboardHelpText }}
		</p>

		<div class="grid-stack">
			<div
				v-for="item in itemsInRowOrder"
				:key="resolveItemKey(item)"
				class="grid-stack-item"
				:class="{ 'cn-dashboard-grid__item--fit': sizeToContentAttr(item) !== undefined }"
				role="group"
				:aria-label="resolveItemLabel(item, layout.indexOf(item))"
				:aria-describedby="itemDescribedBy"
				:tabindex="itemTabindex"
				:gs-id="item.id"
				:gs-x="item.gridX"
				:gs-y="scaledRow(item.gridY)"
				:gs-w="item.gridWidth"
				:gs-h="scaledRow(item.gridHeight)"
				:gs-min-w="minWidth"
				:gs-min-h="minRows(item)"
				:gs-size-to-content="sizeToContentAttr(item)"
				@keydown="onItemKeydown($event, item)">
				<div class="grid-stack-item-content">
					<slot name="widget" :item="item">
						<!-- Default: render nothing; CnDashboardPage provides content -->
					</slot>
				</div>
			</div>
		</div>

		<!--
			Polite live region for keyboard move/resize feedback. A sighted
			user sees the widget slide; a screen-reader user needs the new
			coordinates spoken, otherwise the arrow keys are silent.
		-->
		<p
			class="cn-dashboard-grid__sr-only"
			role="status"
			aria-live="polite"
			aria-atomic="true">
			{{ announcement }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { GridStack } from 'gridstack'
import { toRaw } from 'vue'
import { planGrowth } from '../../utils/gridStack.js'
// `gridstack` is a peerDependency (see package.json), not bundled — this
// component's JS and the consumer's GridStack stylesheet MUST come from the
// exact same installed copy, because GridStack's JS writes layout state
// (e.g. the `--gs-column-width` CSS custom property) that only its OWN
// matching CSS reads. Baking a copy of `gridstack/dist/gridstack.min.css`
// into this library's build (as a previous version did) freezes it at
// nc-vue's build-time version, which can silently drift from whatever the
// consumer's peer-installed copy actually is — the exact mismatch that once
// made every grid item render at 0px width. So nc-vue ships NO GridStack
// CSS of its own: the consumer MUST install `gridstack` themselves and
// import `gridstack/dist/gridstack.min.css` (or their preferred GridStack
// stylesheet) from that same copy.

/**
 * Monotonic counter backing the per-instance DOM ids (the shared
 * `aria-describedby` help text). Module-level so two grids on one page
 * never collide — the same pattern CnCommandPalette uses.
 */
let domIdCounter = 0

/**
 * Pixel offset applied to the grid item's top-left corner when synthesising
 * the `contextmenu` coordinates for a keyboard activation. Nudging the anchor
 * inside the item keeps consumer menus (which position at `clientX/clientY`)
 * visually attached to the widget instead of straddling its border.
 */
const MENU_ANCHOR_OFFSET = 8

/**
 * How many GridStack rows a layout row is drawn as on a grid with
 * size-to-content cells (`wantsRowSplit`): 80px rows become 10px rows.
 */
const ROW_SPLIT = 8

/**
 * Whether a layout holds a size-to-content cell (`sizeToContent` true or a
 * positive row maximum).
 *
 * @param {Array<object>} layout The layout items.
 * @return {boolean} True when one does.
 */
function hasFitCell(layout) {
	return Array.isArray(layout) && layout.some((item) => item
		&& (item.sizeToContent === true || (Number.isFinite(item.sizeToContent) && item.sizeToContent > 0)))
}

/**
 * CnDashboardGrid — Low-level grid layout engine powered by GridStack.
 *
 * Manages the drag-and-drop grid, syncs positions, and emits layout
 * changes. Does NOT handle widget rendering — that's done by the parent
 * via the `#widget` scoped slot.
 *
 * ```vue
 * <CnDashboardGrid
 *   :layout="placements"
 *   :editable="isEditing"
 *   @layout-change="onLayoutChange">
 *   <template #widget="{ item }">
 *     <MyWidget :config="item" />
 *   </template>
 * </CnDashboardGrid>
 * ```
 *
 * ### Keyboard operation
 *
 * With `keyboardRepositioning` on (the default) and `editable` true, each
 * grid item is a tab stop. With an item focused:
 *
 * | Key | Action |
 * | --- | ------ |
 * | `ArrowLeft` / `ArrowRight` | move one column left / right |
 * | `ArrowUp` / `ArrowDown` | move one row up / down |
 * | `Shift` + `ArrowLeft` / `ArrowRight` | shrink / grow width by one column |
 * | `Shift` + `ArrowUp` / `ArrowDown` | shrink / grow height by one row |
 * | `Home` / `End` | jump to the first / last column of the current row |
 * | `Enter` / `Space` | activate the item — see `item-activate` |
 *
 * Keys are only honoured when the grid item itself holds focus, so
 * interactive content rendered inside the `#widget` slot keeps its own
 * key handling untouched.
 */
export default {
	name: 'CnDashboardGrid',

	props: {
		/** Array of layout items: { id, gridX, gridY, gridWidth, gridHeight, ...extra } */
		layout: {
			type: Array,
			required: true,
		},

		/** Whether drag and resize are enabled */
		editable: {
			type: Boolean,
			default: false,
		},

		/** Number of grid columns */
		columns: {
			type: Number,
			default: 12,
		},

		/** Cell height in pixels */
		cellHeight: {
			type: Number,
			default: 80,
		},

		/** Grid margin in pixels */
		margin: {
			type: Number,
			default: 12,
		},

		/** Minimum widget width in grid units */
		minWidth: {
			type: Number,
			default: 2,
		},

		/** Minimum widget height in grid units */
		minHeight: {
			type: Number,
			default: 2,
		},

		/**
		 * GridStack v12 responsive `columnOpts` bag (breakpoints + reflow
		 * layout). When set, the grid reflows column count across screen sizes.
		 * Build it with `getDashboardColumnOpts()`. Default `null` = fixed
		 * `columns`, no responsive reflow (backwards-compatible).
		 *
		 * @type {object|null}
		 */
		columnOpts: {
			type: Object,
			default: null,
		},

		/**
		 * When set, `cellHeight` is mirrored into this CSS custom property on
		 * the document root at init (e.g. `'--app-cell-height'`), so app CSS can
		 * align to the grid geometry. Default `null` = no CSS var written.
		 *
		 * @type {string|null}
		 */
		cellHeightCssVar: {
			type: String,
			default: null,
		},

		/**
		 * Optional `(item) => string|number` to derive each item's render key.
		 * Use it to force a re-render when an item changes in a way its `id`
		 * doesn't capture (e.g. style edits — return `${item.id}:${item.updatedAt}`).
		 * Default `null` = key on `item.id`.
		 *
		 * @type {((item: object) => (string|number))|null}
		 */
		itemKey: {
			type: Function,
			default: null,
		},

		/**
		 * Whether grid items are keyboard-operable: focusable in edit mode and
		 * repositionable/resizable with the arrow keys (WCAG 2.1 SC 2.1.1 —
		 * the keyboard equivalent of the pointer-only GridStack drag). Turning
		 * it off leaves the items non-focusable and drag-only. Default `true`.
		 */
		keyboardRepositioning: {
			type: Boolean,
			default: true,
		},

		/**
		 * Optional `(item, index) => string` returning the accessible name for
		 * a grid item. Use it when the layout items don't carry a human-readable
		 * field (the built-in fallback walks `title` → `name` → `label` →
		 * `widgetTitle` → `widgetId`, then a positional "Widget N"). The returned
		 * string is used verbatim — no coordinates are appended.
		 *
		 * @type {((item: object, index: number) => string)|null}
		 */
		itemLabel: {
			type: Function,
			default: null,
		},

		/**
		 * Whether a keyboard activation (`Enter` / `Space` on a focused grid
		 * item) also dispatches a bubbling `contextmenu` event from inside the
		 * item, so consumers that open a per-widget menu on right-click get the
		 * keyboard path for free — mirroring what browsers do for the `Menu`
		 * key. Set `false` to rely purely on the `item-activate` event.
		 * Default `true`.
		 */
		activateOpensContextMenu: {
			type: Boolean,
			default: true,
		},

		/**
		 * GridStack's `float`. True (the default) keeps every item on the row
		 * it was placed on, with empty rows above it if need be. False packs
		 * items upward, so a size-to-content cell that shrinks, or a widget
		 * that is not shown, closes its gap instead of leaving a band.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-dashboard-closes-the-gap-a-shrinking-or-hidden-widget-leaves
		 */
		float: {
			type: Boolean,
			default: true,
		},

		/**
		 * A side column of a fixed width: `{ width, from? }`. The items from
		 * column `from` (8 by default) on are drawn `width` px wide (the card,
		 * not counting the item margins) and the columns before it share the
		 * rest, so the side cards keep their width on any screen (DqMijnWerk).
		 * Only on the full twelve-column grid and not while editing; GridStack
		 * keeps the twelve columns underneath.
		 *
		 * @spec openspec/changes/dashboard-side-column-width/specs/dashboard-side-column-width/spec.md#requirement-a-dashboard-can-draw-its-side-column-at-a-fixed-width
		 */
		sideColumn: {
			type: Object,
			default: null,
		},
	},

	emits: [
		/**
		 * Fired whenever the grid geometry changed — by drag, by resize, or by
		 * a keyboard nudge. Payload is the full `layout` array with the moved
		 * items' `gridX`/`gridY`/`gridWidth`/`gridHeight` updated.
		 */
		'layout-change',
		/**
		 * Fired when the user activates a focused grid item with `Enter` or
		 * `Space`. Payload `{ item, element, clientX, clientY }` — the layout
		 * item, its DOM element, and viewport coordinates anchored to the
		 * item's top-left corner so a consumer menu can position itself the
		 * same way it does for a right-click.
		 */
		'item-activate',
	],

	data() {
		return {
			grid: null,
			contentObserver: null,
			/** True while the grid moves an item to where the layout put it. */
			applyingLayout: false,
			domId: `cn-dashboard-grid-${++domIdCounter}`,
			/** Text currently held in the polite live region. */
			announcement: '',
			/**
			 * Whether a `columnOpts` breakpoint is currently in force. Mirrored
			 * from the engine by `syncInteractivity` because `isReflowed()` reads
			 * `grid.getColumn()` imperatively, and a computed cannot re-evaluate
			 * on that.
			 */
			reflowed: false,
			/**
			 * How many GridStack rows one layout row is drawn as: 1, or
			 * ROW_SPLIT while `wantsRowSplit` holds. Set before the first render,
			 * since GridStack reads the items' places from their attributes,
			 * and again when the grid is rebuilt.
			 */
			rowSplit: (!this.editable && !this.float && hasFitCell(this.layout)) ? ROW_SPLIT : 1,
		}
	},

	computed: {
		/**
		 * The CSS variables that draw the side column at its width, or null
		 * when the grid keeps its twelve shares.
		 *
		 * @return {object|null}
		 */
		sideColumnStyle() {
			const width = Number(this.sideColumn?.width)
			if (this.editable || !Number.isFinite(width) || width <= 0) {
				return null
			}
			const from = Math.floor(Number(this.sideColumn?.from ?? 8))
			const split = Number.isFinite(from) && from > 0 && from < 12 ? from : 8
			return {
				'--cn-side-width': `${width}px`,
				'--cn-side-from': String(split),
				'--cn-side-span': String(12 - split),
			}
		},

		/**
		 * The layout's items top to bottom, then left to right: the order the
		 * items are in the page, so GridStack places them in that order.
		 *
		 * GridStack sizes a size-to-content cell while it adds the items, one
		 * at a time, and an item it adds onto a cell that has already grown
		 * moves itself below whatever it then collides with. In the layout's
		 * own order a card declared after the lists (pipelinq's full-width
		 * "client in focus" card) was added last, so when the banner above
		 * it grew it skipped past the stat tiles AND the lists and landed at
		 * the bottom. Added top to bottom, every card lands under the one
		 * above it. It is also the order a screen reader and the Tab key
		 * follow. An item without a row or column sorts after the items
		 * that have one, in the layout's order.
		 *
		 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
		 * @return {Array<object>} The items in row order.
		 */
		itemsInRowOrder() {
			const items = Array.isArray(this.layout) ? [...this.layout] : []
			const at = (value) => (Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER)
			return items.sort((a, b) => (at(a.gridY) - at(b.gridY)) || (at(a.gridX) - at(b.gridX)))
		},

		/**
		 * Whether the grid draws each layout row as ROW_SPLIT finer rows. A
		 * size-to-content cell can only be a whole number of rows tall, so on
		 * 80px rows it kept up to a row of empty space under its content and
		 * a packing grid (`float: false`) could not close it (pipelinq and
		 * dossiq Mijn werk, decidiq Mijn acties). Split into 10px rows the
		 * cell ends within 10px of its content and the widgets below move up.
		 *
		 * Only in view mode, only on a packing grid with a size-to-content
		 * cell: every other grid is built exactly as before. Item positions
		 * and sizes scale with the rows, so every widget keeps its pixel
		 * place and size until a cell shrinks; the layout itself, what edit
		 * mode shows and what `layout-change` reports, stays in layout rows.
		 *
		 * @spec openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content
		 * @return {boolean} True to split the rows.
		 */
		wantsRowSplit() {
			return !this.editable && !this.float && hasFitCell(this.layout)
		},

		/**
		 * @return {boolean} Whether the keyboard lane is live — items are
		 *   focusable and the arrow keys reposition. Requires the opt-in prop,
		 *   edit mode (a read-only dashboard has nothing to move, so adding N tab
		 *   stops there would be pure noise), and a grid that is not reflowed,
		 *   which is where a move cannot be kept and so must not be offered.
		 */
		keyboardActive() {
			return this.keyboardRepositioning && this.editable && !this.reflowed
		},

		/**
		 * @return {number|null} `0` when grid items should be tab stops,
		 *   otherwise `null` so the attribute is omitted entirely.
		 */
		itemTabindex() {
			return this.keyboardActive ? 0 : null
		},

		/**
		 * @return {string} DOM id of the shared keyboard-instructions element.
		 */
		keyboardHelpDomId() {
			return `${this.domId}-keyboard-help`
		},

		/**
		 * @return {string|null} `aria-describedby` target for each grid item —
		 *   the instructions element while the keyboard lane is live, `null`
		 *   otherwise (a dangling id reference is an axe violation).
		 */
		itemDescribedBy() {
			return this.keyboardActive ? this.keyboardHelpDomId : null
		},

		/**
		 * @return {string} The spoken key map for the keyboard lane.
		 */
		keyboardHelpText() {
			return t(
				'nextcloud-vue',
				'Use the arrow keys to move this widget one cell. Hold Shift and use the arrow keys to resize it. Press Home or End to jump to the first or last column. Press Enter to open the widget menu.',
			)
		},

		/**
		 * @return {number} The column count currently in force. With responsive
		 *   `columnOpts` GridStack reflows to fewer columns on small screens, so
		 *   clamping must read the live value rather than the `columns` prop.
		 */
		effectiveColumns() {
			if (this.grid && typeof this.grid.getColumn === 'function') {
				const live = this.grid.getColumn()
				if (Number.isFinite(live) && live > 0) {
					return live
				}
			}
			return this.columns
		},
	},

	watch: {
		editable() {
			this.syncInteractivity()
		},

		wantsRowSplit(wants) {
			if (this.grid && (wants ? ROW_SPLIT : 1) !== this.rowSplit) {
				this.rebuildGrid()
			}
		},

		layout: {
			deep: true,
			handler(newLayout) {
				if (this.grid) {
					this.syncGridItems(newLayout)
				}
			},
		},
	},

	mounted() {
		this.initGrid()
		this.$nextTick(() => this.observeContentSizes())
	},

	beforeUnmount() {
		this.disconnectContentObserver()
		if (this.grid) {
			this.grid.destroy(false)
		}
	},

	methods: {
		/**
		 * Derive the v-for render key for a layout item, honouring the optional
		 * `itemKey` prop and falling back to `item.id`.
		 *
		 * @param {object} item the layout item.
		 * @return {string|number} the render key.
		 */
		resolveItemKey(item) {
			return this.itemKey ? this.itemKey(item) : item.id
		},

		/**
		 * The `gs-size-to-content` attribute for a layout item, or `undefined` to
		 * leave the item on its authored `gridHeight`.
		 *
		 * A widget that decides AT RUNTIME it has nothing to show — a banner whose
		 * condition is false, a list that came back empty — still costs its whole
		 * authored row, because the row is reserved from the layout before the
		 * component renders and the engine positions items absolutely, so no CSS
		 * can reclaim it. `sizeToContent` hands the row's height to the content, so
		 * an empty widget collapses and the grid closes up behind it.
		 *
		 * Opt-in per item: it makes `gridHeight` advisory for that widget, which is
		 * wrong for anything with a deliberate size (a map, a chart) and right for
		 * anything whose height is whatever it turned out to have.
		 *
		 * @param {object} item the layout item.
		 * @return {string|undefined} `'true'`, a row maximum as a string, or undefined.
		 */
		sizeToContentAttr(item) {
			const v = item && item.sizeToContent
			if (v === true) {
				return 'true'
			}
			// A number is GridStack's "size to content, but never taller than N rows" (a maximum).
			if (Number.isFinite(v) && v > 0) {
				return String(v * this.rowSplit)
			}
			return undefined
		},

		/**
		 * A layout row coordinate or height in GridStack rows (`rowSplit`).
		 *
		 * @spec openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content
		 * @param {number|undefined} value The value in layout rows.
		 * @return {number|undefined} The value in grid rows, or undefined when none is set.
		 */
		scaledRow(value) {
			return Number.isFinite(value) ? value * this.rowSplit : undefined
		},

		/**
		 * The smallest height an item may take, in grid rows: `minHeight`
		 * layout rows, except for a size-to-content cell on split rows, which
		 * may shrink to its content down to one grid row. The minimum is for
		 * resizing by hand, and that only happens on whole rows in edit mode.
		 *
		 * @spec openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content
		 * @param {object} item The layout item.
		 * @return {number} The minimum height in grid rows.
		 */
		minRows(item) {
			if (this.rowSplit !== 1 && this.sizeToContentAttr(item) !== undefined) {
				return 1
			}
			return this.minHeight * this.rowSplit
		},

		/**
		 * Build the grid again with the row split `wantsRowSplit` asks for, as
		 * edit mode turns on or off: the items go back to their layout places in
		 * the new rows, and the size-to-content cells are measured again.
		 *
		 * @spec openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content
		 * @return {void}
		 */
		rebuildGrid() {
			this.disconnectContentObserver()
			this.grid.destroy(false)
			this.grid = null
			this.rowSplit = this.wantsRowSplit ? ROW_SPLIT : 1
			this.$nextTick(() => {
				if (!this.$refs.gridContainer) {
					return
				}
				// GridStack wrote its own places onto the items; put the layout's back.
				for (const item of this.layout) {
					const el = this.$refs.gridContainer.querySelector(`[gs-id="${item.id}"]`)
					if (!el) {
						continue
					}
					for (const [name, value] of [['gs-y', this.scaledRow(item.gridY)], ['gs-h', this.scaledRow(item.gridHeight)], ['gs-min-h', this.minRows(item)], ['gs-size-to-content', this.sizeToContentAttr(item)]]) {
						if (value === undefined) {
							el.removeAttribute(name)
						} else {
							el.setAttribute(name, String(value))
						}
					}
				}
				this.initGrid()
				this.observeContentSizes()
			})
		},

		/**
		 * Build the accessible name for a grid item. A custom `itemLabel` wins
		 * outright; otherwise the first human-readable field on the item is used
		 * and, while the keyboard lane is live, the current grid coordinates are
		 * appended — without them a screen-reader user tabbing through an edit-mode
		 * dashboard has no way to tell where anything sits.
		 *
		 * @param {object} item the layout item.
		 * @param {number} index the item's index in `layout`, used for the
		 *   last-resort positional name.
		 * @return {string} the accessible name.
		 */
		resolveItemLabel(item, index) {
			if (this.itemLabel) {
				return String(this.itemLabel(item, index) ?? '')
			}

			const base = item.title
				|| item.name
				|| item.label
				|| item.widgetTitle
				|| item.widgetId
				|| t('nextcloud-vue', 'Widget {number}', { number: index + 1 })

			if (!this.keyboardActive) {
				return String(base)
			}

			// Report the rectangle exactly as the reactive `layout` prop states
			// it — unclamped, so the spoken coordinates always match the
			// rendered `gs-*` attributes — and read from the prop (not the
			// GridStack node) so the name re-renders when a move round-trips
			// back through `layout-change`; engine-node mutations are invisible
			// to Vue's reactivity.
			const rect = {
				x: Number.isFinite(item.gridX) ? item.gridX : 0,
				y: Number.isFinite(item.gridY) ? item.gridY : 0,
				w: Number.isFinite(item.gridWidth) ? item.gridWidth : this.minWidth,
				h: Number.isFinite(item.gridHeight) ? item.gridHeight : this.minHeight,
			}
			return t(
				'nextcloud-vue',
				'{label}, column {column} of {columns}, row {row}, {width} columns wide, {height} rows tall',
				{
					label: String(base),
					column: rect.x + 1,
					columns: this.effectiveColumns,
					row: rect.y + 1,
					width: rect.w,
					height: rect.h,
				},
			)
		},

		/**
		 * Build the GridStack grid on the rendered items, install the growth
		 * wrapper (`keepOrderOnGrowth`) and listen for its changes.
		 *
		 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
		 * @return {void}
		 */
		initGrid() {
			if (this.cellHeightCssVar && typeof document !== 'undefined' && document.documentElement) {
				document.documentElement.style.setProperty(this.cellHeightCssVar, `${this.cellHeight}px`)
			}
			const el = this.$refs.gridContainer.querySelector('.grid-stack')
			this.grid = GridStack.init({
				column: this.columns,
				cellHeight: this.cellHeight / this.rowSplit,
				margin: this.margin,
				float: this.float,
				animate: true,
				disableDrag: !this.editable,
				disableResize: !this.editable,
				removable: false,
				...(this.columnOpts ? { columnOpts: this.columnOpts } : {}),
			}, el)
			this.keepOrderOnGrowth()

			this.grid.on('change', (_event, items) => {
				this.handleGridChange(items)
			})

			// A grid that mounts already narrow is reflowed before anyone touches
			// it, so the handles have to be judged here and not only on a later
			// change.
			this.syncInteractivity()
		},

		/**
		 * Let a size-to-content cell that grows push the cards under it down in
		 * their order. GridStack resolves that collision itself, but not in
		 * order: when pipelinq's banner grew from two rows to three, the
		 * full-width card under the stat tiles landed below the lists, also
		 * with `float: false`. Every grow after the grid is built, whether
		 * GridStack measures it on resize or this grid's content observer asks
		 * for it, now first moves the cards the growth reaches down by the
		 * growth (`planGrowth`), bottom-most first, and only then grows the
		 * cell, so GridStack has no collision left to resolve. The wrapper is
		 * installed after `GridStack.init` has already measured the cells on
		 * load; the order on load comes from adding the items in row order
		 * (`itemsInRowOrder`). A cell that shrinks is left to GridStack as
		 * before.
		 *
		 * The grid is read raw: through Vue's proxy `engine.nodes` holds proxies
		 * while `el.gridstackNode` is the plain node, so the growing cell would
		 * not be recognised among the nodes and would be moved down by its own
		 * growth. Moving a cell makes GridStack measure it again, so a cell the
		 * wrapper is already growing goes straight to GridStack.
		 *
		 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
		 * @return {void}
		 */
		keepOrderOnGrowth() {
			const grid = toRaw(this.grid)
			if (!grid || typeof grid.resizeToContent !== 'function' || typeof grid.update !== 'function') {
				return
			}
			const resize = grid.resizeToContent.bind(grid)
			const growing = new Set()
			grid.resizeToContent = (el) => {
				if (growing.has(el)) {
					resize(el)
					return
				}
				const node = el && el.gridstackNode
				const nodes = grid.engine && Array.isArray(grid.engine.nodes) ? grid.engine.nodes : null
				const rows = node && nodes ? this.contentRows(el, node) : null
				const plan = rows ? planGrowth(nodes, node, rows) : []
				if (plan.length === 0) {
					resize(el)
					return
				}
				// Inside a batch the moves are not packed until the cell has grown.
				const batching = Boolean(grid.engine.batchMode)
				growing.add(el)
				try {
					if (!batching) {
						grid.batchUpdate()
					}
					for (const step of plan) {
						grid.update(step.node.el, { y: step.y })
					}
					resize(el)
					if (!batching) {
						grid.batchUpdate(false)
					}
				} finally {
					growing.delete(el)
				}
			}
		},

		/**
		 * The rows a size-to-content cell needs for its content, measured the
		 * way GridStack's `resizeToContent` measures it (the content's first
		 * child, plus the cell's own padding), within its size-to-content row
		 * maximum and its minimum and maximum height.
		 *
		 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
		 * @param {HTMLElement} el The cell.
		 * @param {object} node Its GridStack node.
		 * @return {number|null} The rows, or null when it cannot be measured.
		 */
		contentRows(el, node) {
			const cell = this.grid.getCellHeight(true)
			const item = el.querySelector('.grid-stack-item-content')
			const child = item && item.firstElementChild
			if (!el.clientHeight || !cell || !child || !Number.isFinite(node.h)) {
				return null
			}
			const padding = el.clientHeight - item.clientHeight
			const itemHeight = node.h * cell - padding
			const wanted = child.getBoundingClientRect().height || itemHeight
			let rows = Math.ceil((node.h * cell + wanted - itemHeight) / cell)
			if (Number.isInteger(node.sizeToContent) && rows > node.sizeToContent) {
				rows = node.sizeToContent
			}
			if (node.minH && rows < node.minH) {
				rows = node.minH
			} else if (node.maxH && rows > node.maxH) {
				rows = node.maxH
			}
			return rows
		},

		/**
		 * Keep both editing lanes in step with whether an edit could actually be
		 * kept: the pointer's handles, and — through `reflowed` feeding
		 * `keyboardActive` — the tab stops, the help text and the arrow keys.
		 *
		 * A reflowed grid drops every `change` it receives, for the reason
		 * `handleGridChange` gives. Leaving either lane live there offers an edit
		 * that silently snaps back, which is the same class of surprise as
		 * persisting the reflow — pointed the other way, and harder to explain
		 * because the author did everything right. It is worse on the keyboard,
		 * where the move is also announced as done. The affordance has to say what
		 * the grid will do at this width, not what edit mode does at the authored
		 * one.
		 *
		 * @return {void}
		 */
		syncInteractivity() {
			// Ahead of the engine guard: the keyboard lane reads this whether or
			// not the engine can be enabled.
			this.reflowed = this.isReflowed()
			if (!this.grid || typeof this.grid.enable !== 'function') {
				return
			}
			if (this.editable && !this.reflowed) {
				this.grid.enable()
			} else {
				this.grid.disable()
			}
		},

		/**
		 * Whether the grid is currently rescaled to a column count other than the
		 * authored one, i.e. a `columnOpts` breakpoint is in force.
		 *
		 * The authored count is `columnOpts.columnMax` when there is one, not the
		 * `columns` prop: GridStack widens to `columnMax` above the top breakpoint,
		 * so a consumer whose two disagree is at its widest, not reflowed.
		 *
		 * @return {boolean} True while a responsive reflow is active.
		 */
		isReflowed() {
			if (!this.grid || typeof this.grid.getColumn !== 'function') {
				return false
			}
			const authored = Number.isFinite(this.columnOpts?.columnMax) ? this.columnOpts.columnMax : this.columns
			const live = this.grid.getColumn()
			return Number.isFinite(live) && live > 0 && live !== authored
		},

		handleGridChange(items) {
			// The rescale that crossed a breakpoint arrives here as a `change`, so
			// this is also where the handles are re-judged in both directions:
			// switched off as the grid narrows, and back on as it widens.
			this.syncInteractivity()

			if (this.applyingLayout) {
				return
			}

			// GridStack fires `change` for its own responsive rescale too, and at a
			// 12 → 1 breakpoint every item reads `gridX: 0, gridWidth: 1`. Emitting
			// that has the host persist the reflow AS the authored layout, which
			// widening back does not undo. A move made while reflowed is the same
			// rescaled geometry, so it is dropped for the same reason.
			if (this.isReflowed()) {
				return
			}
			// A grid on split rows is a view-mode grid: what changes in it is
			// packing and size-to-content measuring, never a user's
			// arrangement, and it is not reported as one.
			if (this.rowSplit !== 1) {
				return
			}
			if (!items || items.length === 0) {
				return
			}

			const updated = this.layout.map((item) => {
				const gridItem = items.find((gi) => String(gi.id) === String(item.id))
				if (gridItem) {
					return {
						...item,
						gridX: gridItem.x,
						gridY: gridItem.y,
						gridWidth: gridItem.w,
						gridHeight: gridItem.h,
					}
				}
				return item
			})

			this.$emit('layout-change', updated)
		},

		/**
		 * Keydown handler bound to every grid item.
		 *
		 * Only reacts when the grid item element itself is the event target:
		 * a button, input or menu rendered inside the `#widget` slot must keep
		 * its own arrow/Enter semantics, and a grid that swallowed them would
		 * be a worse a11y regression than the one this handler fixes.
		 *
		 * @param {KeyboardEvent} event the keydown event.
		 * @param {object} item the layout item the key was pressed on.
		 * @return {void}
		 */
		onItemKeydown(event, item) {
			if (!this.keyboardRepositioning) {
				return
			}
			if (event.target !== event.currentTarget) {
				return
			}
			if (event.altKey || event.ctrlKey || event.metaKey) {
				return
			}

			if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
				event.preventDefault()
				this.activateItem(item, event.currentTarget)
				return
			}

			// Repositioning only, and only where it can be kept — an item that
			// still holds focus from before a reflow keeps its Enter, but its
			// arrow keys stop moving something that would snap back.
			if (!this.keyboardActive) {
				return
			}

			const handled = this.applyKey(event.key, event.shiftKey, item)
			if (handled) {
				// Arrows would otherwise scroll the dashboard out from under
				// the widget the user is moving.
				event.preventDefault()
				event.stopPropagation()
			}
		},

		/**
		 * Translate one repositioning key into a geometry change.
		 *
		 * @param {string} key the `KeyboardEvent.key` value.
		 * @param {boolean} shift whether Shift was held (resize instead of move).
		 * @param {object} item the layout item being operated on.
		 * @return {boolean} `true` when the key belongs to the grid and the
		 *   default action must be suppressed.
		 */
		applyKey(key, shift, item) {
			const rect = this.currentRect(item)

			switch (key) {
				case 'ArrowLeft':
					return shift
						? this.applyGeometry(item, { w: rect.w - 1 }, 'resize')
						: this.applyGeometry(item, { x: rect.x - 1 }, 'move')
				case 'ArrowRight':
					return shift
						? this.applyGeometry(item, { w: rect.w + 1 }, 'resize')
						: this.applyGeometry(item, { x: rect.x + 1 }, 'move')
				case 'ArrowUp':
					return shift
						? this.applyGeometry(item, { h: rect.h - 1 }, 'resize')
						: this.applyGeometry(item, { y: rect.y - 1 }, 'move')
				case 'ArrowDown':
					return shift
						? this.applyGeometry(item, { h: rect.h + 1 }, 'resize')
						: this.applyGeometry(item, { y: rect.y + 1 }, 'move')
				case 'Home':
					return this.applyGeometry(item, { x: 0 }, 'move')
				case 'End':
					return this.applyGeometry(item, { x: this.effectiveColumns - rect.w }, 'move')
				default:
					return false
			}
		},

		/**
		 * Read an item's live rectangle. The GridStack node is preferred over
		 * the `layout` prop because a drag that has not yet round-tripped
		 * through the consumer's persistence leaves the prop momentarily stale,
		 * and a keyboard nudge must continue from where the widget actually is.
		 *
		 * @param {object} item the layout item.
		 * @return {{x: number, y: number, w: number, h: number}} the rectangle
		 *   in grid units.
		 */
		currentRect(item) {
			const node = this.gridNode(item.id)
			if (node && Number.isFinite(node.x) && Number.isFinite(node.y)) {
				return {
					x: node.x,
					y: node.y,
					w: Number.isFinite(node.w) ? node.w : this.minWidth,
					h: Number.isFinite(node.h) ? node.h : this.minHeight,
				}
			}
			return {
				x: Number.isFinite(item.gridX) ? item.gridX : 0,
				y: Number.isFinite(item.gridY) ? item.gridY : 0,
				w: Number.isFinite(item.gridWidth) ? item.gridWidth : this.minWidth,
				h: Number.isFinite(item.gridHeight) ? item.gridHeight : this.minHeight,
			}
		},

		/**
		 * Clamp a candidate rectangle to the grid's bounds and the configured
		 * minimum widget size, so a held-down arrow key parks the widget at the
		 * edge instead of pushing it into negative coordinates.
		 *
		 * @param {{x: number, y: number, w: number, h: number}} rect the candidate.
		 * @return {{x: number, y: number, w: number, h: number}} the clamped rectangle.
		 */
		clampRect(rect) {
			const cols = this.effectiveColumns
			const w = Math.min(Math.max(rect.w, this.minWidth), cols)
			const h = Math.max(rect.h, this.minHeight)
			return {
				x: Math.min(Math.max(rect.x, 0), Math.max(cols - w, 0)),
				y: Math.max(rect.y, 0),
				w,
				h,
			}
		},

		/**
		 * Apply a partial geometry change to an item.
		 *
		 * The change is pushed through `GridStack.update()` — the very call the
		 * drag/resize handlers end in — so collision resolution, the `change`
		 * event and therefore the `layout-change` emission and the consumer's
		 * persistence are identical for keyboard and pointer. There is
		 * deliberately no second, direct-to-`layout` update path.
		 *
		 * @param {object} item the layout item to move or resize.
		 * @param {{x?: number, y?: number, w?: number, h?: number}} patch the
		 *   requested change, merged over the item's current rectangle.
		 * @param {'move'|'resize'} kind which announcement to speak.
		 * @return {boolean} `true` when the key was consumed — including when
		 *   the widget was already at the edge, because the arrow still belongs
		 *   to the grid and must not scroll the page.
		 */
		applyGeometry(item, patch, kind) {
			const el = this.itemElement(item.id)
			if (!el || !this.grid || typeof this.grid.update !== 'function') {
				return false
			}

			const current = this.currentRect(item)
			const next = this.clampRect({ ...current, ...patch })

			if (next.x === current.x && next.y === current.y
				&& next.w === current.w && next.h === current.h) {
				this.announce(t('nextcloud-vue', '{label} cannot move further in that direction', {
					label: this.announcementLabel(item),
				}))
				return true
			}

			this.grid.update(el, next)

			this.announce(kind === 'resize'
				? t('nextcloud-vue', '{label} resized to {width} columns by {height} rows', {
						label: this.announcementLabel(item),
						width: next.w,
						height: next.h,
					})
				: t('nextcloud-vue', '{label} moved to column {column}, row {row}', {
						label: this.announcementLabel(item),
						column: next.x + 1,
						row: next.y + 1,
					}))

			return true
		},

		/**
		 * The short, coordinate-free name used inside live-region sentences —
		 * the full `aria-label` already carries the coordinates and repeating
		 * them would make every announcement unlistenable.
		 *
		 * @param {object} item the layout item.
		 * @return {string} the short name.
		 */
		announcementLabel(item) {
			return String(item.title
				|| item.name
				|| item.label
				|| item.widgetTitle
				|| item.widgetId
				|| t('nextcloud-vue', 'Widget'))
		},

		/**
		 * Push text into the polite live region. The region is cleared first so
		 * two identical consecutive announcements (e.g. two failed nudges at the
		 * grid edge) are both spoken — assistive tech ignores a re-render that
		 * leaves the text unchanged.
		 *
		 * @param {string} text the message to announce.
		 * @return {void}
		 */
		announce(text) {
			this.announcement = ''
			this.$nextTick(() => {
				this.announcement = text
			})
		},

		/**
		 * Handle `Enter` / `Space` on a focused grid item: tell the consumer via
		 * `item-activate`, and — unless opted out — synthesise the `contextmenu`
		 * event a right-click would have produced, anchored to the item, so
		 * pointer-only widget menus become keyboard-reachable without the
		 * consumer wiring anything new. The synthetic event is dispatched from
		 * inside the item's content so it bubbles through the slot's own root
		 * element (where such handlers live) and on up.
		 *
		 * @param {object} item the layout item being activated.
		 * @param {HTMLElement} el the grid item element.
		 * @return {void}
		 */
		activateItem(item, el) {
			const rect = typeof el.getBoundingClientRect === 'function'
				? el.getBoundingClientRect()
				: { left: 0, top: 0 }
			const clientX = Math.round((rect.left || 0) + MENU_ANCHOR_OFFSET)
			const clientY = Math.round((rect.top || 0) + MENU_ANCHOR_OFFSET)

			this.$emit('item-activate', { item, element: el, clientX, clientY })

			if (this.activateOpensContextMenu) {
				this.dispatchContextMenu(el, clientX, clientY)
			}
		},

		/**
		 * Dispatch a bubbling, cancelable `contextmenu` MouseEvent from inside a
		 * grid item.
		 *
		 * @param {HTMLElement} el the grid item element.
		 * @param {number} clientX viewport x for the menu anchor.
		 * @param {number} clientY viewport y for the menu anchor.
		 * @return {void}
		 */
		dispatchContextMenu(el, clientX, clientY) {
			if (typeof MouseEvent !== 'function') {
				return
			}
			const content = el.querySelector('.grid-stack-item-content')
			const target = (content && content.firstElementChild) || content || el
			target.dispatchEvent(new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX,
				clientY,
				button: 2,
			}))
		},

		/**
		 * Look up a grid item's DOM element by its layout id.
		 *
		 * @param {string|number} id the layout item id.
		 * @return {HTMLElement|null} the element, or `null` when not rendered.
		 */
		itemElement(id) {
			const container = this.$refs.gridContainer
			if (!container) {
				return null
			}
			return container.querySelector(`[gs-id="${id}"]`)
		},

		/**
		 * Look up the GridStack engine node backing a layout item.
		 *
		 * @param {string|number} id the layout item id.
		 * @return {object|null} the node, or `null` when GridStack isn't tracking it.
		 */
		/**
		 * Re-measure a `sizeToContent` item when its content changes height.
		 * GridStack watches only the grid element, so a widget that loaded its data
		 * in `mounted()` keeps the height its empty state had.
		 *
		 * @return {void}
		 */
		observeContentSizes() {
			this.disconnectContentObserver()
			if (typeof ResizeObserver === 'undefined' || !this.$refs.gridContainer) {
				return
			}

			this.contentObserver = new ResizeObserver((entries) => {
				const cells = new Set()
				for (const entry of entries) {
					const cell = entry.target.closest('.grid-stack-item')
					if (cell) {
						cells.add(cell)
					}
				}
				if (cells.size === 0) {
					return
				}
				// A frame later, not inline: `resizeToContent` resizes the cell the
				// observed child sits in, and a child that stretches to its parent
				// grows with it. Resizing from inside the callback makes that the
				// classic ResizeObserver loop ("undelivered notifications"); deferred,
				// it is an ordinary second pass that settles.
				requestAnimationFrame(() => {
					if (!this.contentObserver || !this.grid || typeof this.grid.resizeToContent !== 'function') {
						return
					}
					for (const cell of cells) {
						this.grid.resizeToContent(cell)
					}
				})
			})

			const cells = this.$refs.gridContainer.querySelectorAll('.grid-stack-item[gs-size-to-content]')
			for (const cell of cells) {
				const measured = cell.querySelector('.grid-stack-item-content')?.firstElementChild
				if (measured) {
					this.contentObserver.observe(measured)
				}
			}
		},

		/**
		 * Drop the content observer, on unmount or before rebuilding it.
		 *
		 * @return {void}
		 */
		disconnectContentObserver() {
			if (this.contentObserver) {
				this.contentObserver.disconnect()
				this.contentObserver = null
			}
		},

		gridNode(id) {
			const nodes = this.grid && this.grid.engine && this.grid.engine.nodes
			if (!Array.isArray(nodes)) {
				return null
			}
			return nodes.find((n) => String(n.id) === String(id)) || null
		},

		syncGridItems(newLayout) {
			// Add new items, and re-adopt items whose backing DOM element was
			// replaced. When a consumer's `itemKey` changes for an unchanged
			// `id` (e.g. a style edit — the documented use of `itemKey`), Vue
			// swaps the element. GridStack keeps tracking the old, now-detached
			// element, leaving the new one unmanaged (no positioning/sizing) —
			// so re-register it against the new element.
			for (const item of newLayout) {
				this.$nextTick(() => {
					const el = this.$refs.gridContainer.querySelector(`[gs-id="${item.id}"]`)
					if (!el) {
						return
					}
					const node = this.grid.engine.nodes.find((n) => String(n.id) === String(item.id))
					if (!node) {
						this.grid.makeWidget(el)
					} else if (node.el === el) {
						// The layout MOVED an item the grid already tracks: the
						// page re-compacts its display layout when a widget's
						// condition hides it, and the item below was given a new
						// gridY that never reached GridStack, so a band stayed
						// where the hidden widget had been. A drag reports the
						// grid's own position back, which matches and does
						// nothing here.
						const x = item.gridX ?? node.x
						const y = Number.isFinite(item.gridY) ? item.gridY * this.rowSplit : node.y
						if (x !== node.x || y !== node.y) {
							// The layout said where it goes; GridStack's `change`
							// for it is not a user's arrangement and is not
							// reported back (it would write the display-only
							// compaction into the authored layout).
							this.applyingLayout = true
							try {
								this.grid.update(el, { x, y })
							} finally {
								this.applyingLayout = false
							}
						}
					} else {
						// Drop the stale node without touching its detached DOM,
						// then adopt the new element so GridStack sizes/places it.
						this.grid.removeWidget(node.el, false, false)
						this.grid.makeWidget(el)
					}
				})
			}

			// Remove items no longer in layout
			const ids = newLayout.map((i) => String(i.id))
			const toRemove = this.grid.engine.nodes.filter((n) => !ids.includes(String(n.id)))
			for (const node of toRemove) {
				const el = this.$refs.gridContainer.querySelector(`[gs-id="${node.id}"]`)
				if (el) {
					this.grid.removeWidget(el, false)
				}
			}

			// Elements were added or replaced, so the observer's are stale.
			this.$nextTick(() => this.observeContentSizes())
		},
	},
}
</script>

<style scoped>
.cn-dashboard-grid {
	width: 100%;
	min-height: 200px;
}

.grid-stack {
	background: transparent;
}

/* `sideColumn`: an item's left edge and width follow its column on two
   scales, the columns before `--cn-side-from` sharing what the side column
   leaves, the columns after it sharing the side column's fixed width (the
   card plus its two item margins). GridStack writes `--gs-x` and `--gs-w` on
   every item and its own left and width inline, hence !important. */
.cn-dashboard-grid--side-column > .grid-stack.gs-12:not(.grid-stack-rtl) > .grid-stack-item {
	--cn-side-cell: calc(var(--cn-side-width) + var(--gs-item-margin-left, 0px) + var(--gs-item-margin-right, 0px));
	--cn-main-col: calc((100% - var(--cn-side-cell)) / var(--cn-side-from));
	--cn-side-col: calc(var(--cn-side-cell) / var(--cn-side-span));
	/* stylelint-disable-next-line csstools/use-logical -- GridStack places a left-to-right item by `left`. */
	left: calc(min(var(--gs-x), var(--cn-side-from)) * var(--cn-main-col) + max(var(--gs-x) - var(--cn-side-from), 0) * var(--cn-side-col)) !important;
	width: calc((min(var(--gs-x) + var(--gs-w), var(--cn-side-from)) - min(var(--gs-x), var(--cn-side-from))) * var(--cn-main-col) + (max(var(--gs-x) + var(--gs-w) - var(--cn-side-from), 0) - max(var(--gs-x) - var(--cn-side-from), 0)) * var(--cn-side-col)) !important;
}

/* Screen-reader-only text: the keyboard key map and the live region. Kept in
   the layout (not `display: none`) so assistive tech still reads it. */
.cn-dashboard-grid__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

/* Grid items become tab stops in edit mode — give them a visible focus ring
   that satisfies WCAG 2.1 SC 2.4.7 without relying on the widget's own
   styling. `outline-offset` keeps the ring outside the rounded card. */
.grid-stack-item:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 2px;
	border-radius: var(--border-radius-container-large, 16px);
}

/* A size-to-content cell (`sizeToContent`) is measured by GridStack from the
   content's first child, and a widget wrapper there filled the cell
   (`height: 100%`), so the measure returned the cell's own height and the
   cell never shrank: "Waiting for me" stayed a tall card around one row. In
   such a cell the child takes its own height. A cell without the key keeps
   the filling child. */
.cn-dashboard-grid__item--fit > :deep(.grid-stack-item-content > *) {
	height: auto;
}

:deep(.grid-stack-item-content) {
	background: var(--color-main-background);
	border: none;
	box-shadow: none;
	overflow: hidden;
}

:deep(.grid-stack-item-content:has(.cn-widget-wrapper--borderless)) {
	background: transparent;
}

:deep(.grid-stack-placeholder > .placeholder-content) {
	background: var(--color-primary-element-light);
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large);
}
</style>
