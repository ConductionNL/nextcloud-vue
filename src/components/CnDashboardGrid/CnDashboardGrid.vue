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
	<div ref="gridContainer" class="cn-dashboard-grid">
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
				v-for="(item, index) in layout"
				:key="resolveItemKey(item)"
				class="grid-stack-item"
				role="group"
				:aria-label="resolveItemLabel(item, index)"
				:aria-describedby="itemDescribedBy"
				:tabindex="itemTabindex"
				:gs-id="item.id"
				:gs-x="item.gridX"
				:gs-y="item.gridY"
				:gs-w="item.gridWidth"
				:gs-h="item.gridHeight"
				:gs-min-w="minWidth"
				:gs-min-h="minHeight"
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
import 'gridstack/dist/gridstack.min.css'

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
		 * @type {Function|null}
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
		 * @type {Function|null}
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
			domId: `cn-dashboard-grid-${++domIdCounter}`,
			/** Text currently held in the polite live region. */
			announcement: '',
		}
	},

	computed: {
		/**
		 * @return {boolean} Whether the keyboard lane is live — items are
		 *   focusable and the arrow keys reposition. Requires both the opt-in
		 *   prop and edit mode (a read-only dashboard has nothing to move, so
		 *   adding N tab stops there would be pure noise).
		 */
		keyboardActive() {
			return this.keyboardRepositioning && this.editable
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
		editable(val) {
			if (!this.grid) return
			if (val) {
				this.grid.enable()
			} else {
				this.grid.disable()
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
	},

	beforeUnmount() {
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

		initGrid() {
			if (this.cellHeightCssVar && typeof document !== 'undefined' && document.documentElement) {
				document.documentElement.style.setProperty(this.cellHeightCssVar, `${this.cellHeight}px`)
			}
			const el = this.$refs.gridContainer.querySelector('.grid-stack')
			this.grid = GridStack.init({
				column: this.columns,
				cellHeight: this.cellHeight,
				margin: this.margin,
				float: true,
				animate: true,
				disableDrag: !this.editable,
				disableResize: !this.editable,
				removable: false,
				...(this.columnOpts ? { columnOpts: this.columnOpts } : {}),
			}, el)

			this.grid.on('change', (_event, items) => {
				this.handleGridChange(items)
			})
		},

		handleGridChange(items) {
			if (!items || items.length === 0) return

			const updated = this.layout.map(item => {
				const gridItem = items.find(gi => String(gi.id) === String(item.id))
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
			if (!this.keyboardRepositioning) return
			if (event.target !== event.currentTarget) return
			if (event.altKey || event.ctrlKey || event.metaKey) return

			if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
				event.preventDefault()
				this.activateItem(item, event.currentTarget)
				return
			}

			if (!this.editable) return

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
			return String(
				item.title
				|| item.name
				|| item.label
				|| item.widgetTitle
				|| item.widgetId
				|| t('nextcloud-vue', 'Widget'),
			)
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
			if (typeof MouseEvent !== 'function') return
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
			if (!container) return null
			return container.querySelector(`[gs-id="${id}"]`)
		},

		/**
		 * Look up the GridStack engine node backing a layout item.
		 *
		 * @param {string|number} id the layout item id.
		 * @return {object|null} the node, or `null` when GridStack isn't tracking it.
		 */
		gridNode(id) {
			const nodes = this.grid && this.grid.engine && this.grid.engine.nodes
			if (!Array.isArray(nodes)) return null
			return nodes.find(n => String(n.id) === String(id)) || null
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
					const node = this.grid.engine.nodes.find(
						n => String(n.id) === String(item.id),
					)
					if (!node) {
						this.grid.makeWidget(el)
					} else if (node.el !== el) {
						// Drop the stale node without touching its detached DOM,
						// then adopt the new element so GridStack sizes/places it.
						this.grid.removeWidget(node.el, false, false)
						this.grid.makeWidget(el)
					}
				})
			}

			// Remove items no longer in layout
			const ids = newLayout.map(i => String(i.id))
			const toRemove = this.grid.engine.nodes.filter(
				n => !ids.includes(String(n.id)),
			)
			for (const node of toRemove) {
				const el = this.$refs.gridContainer.querySelector(`[gs-id="${node.id}"]`)
				if (el) {
					this.grid.removeWidget(el, false)
				}
			}
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

/* Screen-reader-only text: the keyboard key map and the live region. Kept in
   the layout (not `display: none`) so assistive tech still reads it. */
.cn-dashboard-grid__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
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

:deep(.grid-stack-item-content) {
	background: var(--color-main-background);
	/* Match CnWidgetWrapper's container radius: this backing surface sits
	   BEHIND the rounded widget card, and a square (radius 0) backing pokes
	   out at the card's corners whenever --color-main-background differs
	   from the page background (dark mode / tinted themes) — a dark grey
	   square under every rounded corner. */
	border-radius: var(--border-radius-container-large, 16px);
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
