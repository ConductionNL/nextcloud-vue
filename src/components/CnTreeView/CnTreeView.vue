<template>
	<div class="cn-tree-view" data-testid="cn-tree-view">
		<header v-if="title || description" class="cn-tree-view__header">
			<h3 v-if="title" class="cn-tree-view__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-tree-view__description">
				{{ description }}
			</p>
		</header>

		<p v-if="safeNodes.length === 0" class="cn-tree-view__empty">
			{{ emptyLabel }}
		</p>

		<Draggable v-else-if="reorderable"
			:modelValue="safeNodes"
			:itemKey="idKey"
			tag="ul"
			class="cn-tree-view__root"
			role="tree"
			handle=".cn-tree-node__handle"
			@change="onRootDragChange">
			<template #item="{ element: node, index }">
				<CnTreeNode :node="node"
					:depth="0"
					:indent="indent"
					:expandedIds="expandedMap"
					:selectedId="selectedId"
					:idKey="idKey"
					:labelKey="labelKey"
					:childrenKey="childrenKey"
					:expandLabel="expandLabel"
					:collapseLabel="collapseLabel"
					:toggleAttrs="toggleAttrs"
					:rowAttrs="rowAttrs"
					:focusableRows="focusableRows"
					reorderable
					:reorderLabels="reorderTexts"
					:siblingIndex="index"
					:siblingCount="safeNodes.length"
					@toggle="toggleNode"
					@select="selectNode"
					@move="moveNode">
					<template #actions="scope">
						<slot name="actions" v-bind="scope" />
					</template>
					<template v-if="$slots.label" #label="scope">
						<slot name="label" v-bind="scope" />
					</template>
				</CnTreeNode>
			</template>
		</Draggable>
		<ul v-else class="cn-tree-view__root" role="tree">
			<CnTreeNode v-for="node in safeNodes"
				:key="node[idKey]"
				:node="node"
				:depth="0"
				:indent="indent"
				:expandedIds="expandedMap"
				:selectedId="selectedId"
				:idKey="idKey"
				:labelKey="labelKey"
				:childrenKey="childrenKey"
				:expandLabel="expandLabel"
				:collapseLabel="collapseLabel"
				:toggleAttrs="toggleAttrs"
				:rowAttrs="rowAttrs"
				:focusableRows="focusableRows"
				@toggle="toggleNode"
				@select="selectNode">
				<template #actions="scope">
					<!-- @slot actions Per-row actions. Scope:
					     { node, depth }. -->
					<slot name="actions" v-bind="scope" />
				</template>
				<template v-if="$slots.label" #label="scope">
					<!-- @slot label Replaces the label text of every row. Scope:
					     { node, depth, expanded }. Unused, the row shows
					     `node[labelKey]`. -->
					<slot name="label" v-bind="scope" />
				</template>
			</CnTreeNode>
		</ul>

		<p v-for="key in statusSlots"
			:key="key"
			class="cn-tree-view__status"
			:class="{ 'hidden-visually': !statusText }"
			role="status"
			data-testid="cn-tree-view-status">
			{{ statusText }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import Draggable from 'vuedraggable'
import CnTreeNode from './CnTreeNode.vue'

/**
 * CnTreeView — Recursive hierarchical tree widget. Renders nested
 * nodes with click-to-expand carets, optional badges + icons,
 * inline per-row actions slot, and select-on-click semantics.
 *
 * With `reorderable` a row moves among its siblings by dragging or with Move
 * up and Move down. Both say the new position, and the buttons keep focus, so
 * the tree works without a pointer (WCAG 2.2 SC 2.1.1, 2.5.7). Moving between
 * parents is not offered. The host owns the tree through `v-model:nodes`, and
 * saves on `move`.
 *
 * ```vue
 * <CnTreeView
 *   :nodes="[
 *     { id: 1, label: 'Knowledge base', children: [
 *       { id: 2, label: 'How-tos',  children: [
 *         { id: 3, label: 'Reset password' },
 *       ] },
 *       { id: 4, label: 'Reference' },
 *     ] },
 *   ]"
 *   v-model:expanded-ids="expanded"
 *   v-model:selected-id="selected"
 *   @select="onSelect" />
 * ```
 *
 * Slots:
 * - `#actions` — inline per-row actions (e.g. edit / delete
 *   buttons). Scope: `{ node, depth }`.
 * - `#label` — the label of every row, for an icon, a marker or a test id
 *   next to the text. Scope: `{ node, depth, expanded }`. Unused, the row
 *   shows `node[labelKey]`.
 *
 * Per-node hooks, all off by default:
 * - `expandLabel` / `collapseLabel` take a function `(node) => string` for a
 *   name per row, e.g. "Expand {name}".
 * - `toggleAttrs` and `rowAttrs` add attributes per node to the expand button
 *   and the row (test ids, `data-*`, an active class, a role).
 * - `focusableRows` lets keyboard users reach a row and select it with
 *   Enter or Space.
 */
export default {
	name: 'CnTreeView',
	components: { CnTreeNode, Draggable },
	props: {
		/**
		 * Tree nodes (root level). Each node:
		 * `{ id, label, children?, icon?, badge? }`. The keys
		 * `id`, `label`, `children` are configurable via the
		 * `*Key` props.
		 *
		 * Defaults to an empty array and is null-guarded (see `safeNodes`)
		 * so a parent that hasn't loaded its data yet — passing `undefined`
		 * or `null` — renders the empty state instead of throwing on
		 * `nodes.length` during render (ADR-062: never crash a detail page).
		 *
		 * @type {Array<object>}
		 */
		nodes: { type: Array, default: () => [] },
		/**
		 * Set of currently-expanded node ids. Pass with `.sync`
		 * (or `:expanded-ids` + `@update:expanded-ids`) to control
		 * expansion state from the parent.
		 *
		 * @type {Array<string|number>}
		 */
		expandedIds: { type: Array, default: () => [] },
		/**
		 * Currently-selected node id (or null). Node ids are read off
		 * `node[idKey]`, so the same `string | number` domain as `expandedIds`.
		 * Pass with `.sync`.
		 *
		 * @type {string|number|null}
		 */
		selectedId: { type: [String, Number], default: null },
		/** Override the `id` key on node objects. */
		idKey: { type: String, default: 'id' },
		/** Override the `label` key. */
		labelKey: { type: String, default: 'label' },
		/** Override the `children` key. */
		childrenKey: { type: String, default: 'children' },
		/** Indent per depth (px). */
		indent: { type: Number, default: 18 },
		/** Optional title rendered above the tree. */
		title: { type: String, default: '' },
		/** Optional description rendered under the title. */
		description: { type: String, default: '' },
		/** Empty-state text when nodes[] is empty. */
		emptyLabel: { type: String, default: 'No items.' },
		/** A11y label for the expand button, or `(node) => string` for a name per row. */
		expandLabel: { type: [String, Function], default: 'Expand' },
		/** A11y label for the collapse button, or `(node) => string` for a name per row. */
		collapseLabel: { type: [String, Function], default: 'Collapse' },
		/**
		 * Extra attributes for each row's expand button, as `(node, depth) => object`,
		 * e.g. a test id per node. Null adds none.
		 */
		toggleAttrs: { type: Function, default: null },
		/**
		 * Extra attributes for each row, as `(node, depth) => object`: a class,
		 * `data-*` attributes, or a `role` and `aria-label`. `class` and `style`
		 * merge with the row's own. Null adds none.
		 */
		rowAttrs: { type: Function, default: null },
		/**
		 * Makes each row reachable with Tab (`tabindex="0"`); Enter or Space on
		 * the row selects its node, like a click. Off, rows are click-only.
		 */
		focusableRows: { type: Boolean, default: false },
		/** Rows can be moved among their siblings: a drag handle, Move up and Move down. */
		reorderable: { type: Boolean, default: false },
		/**
		 * Replacement texts for reordering, already translated: `moveUp`, `moveDown`, `drag`,
		 * `controlName` (`{action}`, `{label}`), `moved` (`{label}`, `{position}`, `{total}`).
		 */
		reorderLabels: { type: Object, default: () => ({}) },
		/** A status the host sets after saving a move, such as "Saved"; it replaces the spoken position. */
		moveStatus: { type: String, default: '' },
		/** Expand all nodes on mount. */
		expandAllOnMount: { type: Boolean, default: false },
	},

	emits: ['select', 'update:expanded-ids', 'update:selected-id', 'update:nodes', 'move'],

	data() {
		return {
			announcement: '',
		}
	},

	computed: {
		/** @return {object} The texts of the move controls, with library defaults. */
		reorderTexts() {
			return {
				moveUp: t('nextcloud-vue', 'Move up'),
				moveDown: t('nextcloud-vue', 'Move down'),
				drag: t('nextcloud-vue', 'Drag to reorder'),
				controlName: t('nextcloud-vue', '{action}: {label}'),
				moved: t('nextcloud-vue', '{label} moved to position {position} of {total}.'),
				...this.reorderLabels,
			}
		},

		/**
		 * One entry when the status line shows. A `v-for` leaves no placeholder in the
		 * markup when off, which `v-if` would.
		 *
		 * @return {string[]} The keys.
		 */
		statusSlots() {
			return this.reorderable ? ['status'] : []
		},

		/** @return {string} What the status line says. */
		statusText() {
			return this.moveStatus || this.announcement
		},

		/**
		 * The `nodes` prop coerced to a real array. Guards against a parent
		 * that passes `null` / `undefined` (or a non-array) while its data is
		 * still loading — Vue only applies the prop default for `undefined`,
		 * so an explicit `null` would otherwise reach `nodes.length` and throw
		 * during render.
		 *
		 * @return {Array<object>}
		 */
		safeNodes() {
			return Array.isArray(this.nodes) ? this.nodes : []
		},

		/**
		 * `expandedIds[]` lifted to an object map for O(1) lookups
		 * inside the recursive node.
		 *
		 * @return {Record<string,true>}
		 */
		expandedMap() {
			const out = {}
			for (const id of this.expandedIds) {
				out[id] = true
			}
			return out
		},
	},

	mounted() {
		if (this.expandAllOnMount) {
			const ids = []
			const walk = (n) => {
				ids.push(n[this.idKey])
				const cs = n[this.childrenKey]
				if (Array.isArray(cs)) {
					cs.forEach(walk)
				}
			}
			this.safeNodes.forEach(walk)
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:expanded-ids <description>` is read as one long
			// event NAME and the generated docs show an empty description.
			/**
			 * `v-model:expanded-ids` counterpart. Payload is the new full set.
			 *
			 * @event update:expanded-ids
			 */
			this.$emit('update:expanded-ids', ids)
		}
	},

	methods: {
		/**
		 * Toggle a node's expanded state by id. Emits
		 * `update:expanded-ids` with the new array.
		 *
		 * @param {string|number} id Node id.
		 * @return {void}
		 */
		toggleNode(id) {
			const next = [...this.expandedIds]
			const idx = next.indexOf(id)
			if (idx >= 0) {
				next.splice(idx, 1)
			} else {
				next.push(id)
			}
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:expanded-ids <description>` is read as one long
			// event NAME and the generated docs show an empty description.
			/**
			 * `v-model:expanded-ids` counterpart. Payload is the new full set.
			 *
			 * @event update:expanded-ids
			 */
			this.$emit('update:expanded-ids', next)
		},

		/**
		 * A row at the root was dragged to another place.
		 *
		 * @param {{moved?: {element: object, oldIndex: number, newIndex: number}}} change What the drag changed.
		 * @return {void}
		 */
		onRootDragChange({ moved } = {}) {
			if (moved) {
				this.moveNode({ node: moved.element, parentId: null, from: moved.oldIndex, to: moved.newIndex })
			}
		},

		/**
		 * The nodes with one list of siblings in its new order. Only the path to
		 * that list is copied.
		 *
		 * @param {Array<object>} list The nodes at this level.
		 * @param {{parentId: string|number|null, from: number, to: number}} move The move.
		 * @return {Array<object>} The new nodes.
		 */
		movedIn(list, { parentId, from, to }) {
			if (parentId === null) {
				const next = [...list]
				next.splice(to, 0, next.splice(from, 1)[0])
				return next
			}
			return list.map((node) => {
				const children = node[this.childrenKey]
				if (!Array.isArray(children)) {
					return node
				}
				const reordered = node[this.idKey] === parentId
					? this.movedIn(children, { parentId: null, from, to })
					: this.movedIn(children, { parentId, from, to })
				return { ...node, [this.childrenKey]: reordered }
			})
		},

		/**
		 * The list of siblings a parent holds.
		 *
		 * @param {Array<object>} list The nodes to look in.
		 * @param {string|number|null} parentId The parent, or null for the root.
		 * @return {Array<object>|null} Its children.
		 */
		siblingsOf(list, parentId) {
			if (parentId === null) {
				return list
			}
			for (const node of list) {
				const children = node[this.childrenKey]
				if (Array.isArray(children)) {
					const found = node[this.idKey] === parentId ? children : this.siblingsOf(children, parentId)
					if (found) {
						return found
					}
				}
			}
			return null
		},

		/**
		 * Apply a move: give the host the new tree, say where the node landed, and
		 * after a button keep focus on that button, or on the other one at the end.
		 *
		 * @param {{node: object, parentId: string|number|null, from: number, to: number, byButton?: boolean}} move The move.
		 * @return {void}
		 */
		moveNode({ node, parentId, from, to, byButton }) {
			const nodes = this.movedIn(this.safeNodes, { parentId, from, to })
			const siblings = this.siblingsOf(nodes, parentId)
			if (!siblings || to < 0 || to >= siblings.length) {
				return
			}
			this.$emit('update:nodes', nodes)
			/**
			 * @event move A row moved. Save the order here.
			 * @type {{node: object, parentId: string|number|null, from: number, to: number, siblings: Array<object>}}
			 */
			this.$emit('move', { node, parentId, from, to, siblings })
			this.announcement = this.reorderTexts.moved
				.replace('{label}', String(node[this.labelKey] ?? ''))
				.replace('{position}', String(to + 1))
				.replace('{total}', String(siblings.length))
			if (byButton) {
				this.$nextTick(() => this.focusMoveButton(node[this.idKey], to < from ? 'up' : 'down'))
			}
		},

		/**
		 * Focus a row's move button, or its other one when that is disabled.
		 *
		 * @param {string|number} id The node.
		 * @param {string} direction `up` or `down`.
		 * @return {void}
		 */
		focusMoveButton(id, direction) {
			const row = [...this.$el.querySelectorAll('.cn-tree-node')]
				.find((element) => element.dataset.nodeId === String(id))
				?.querySelector(':scope > .cn-tree-node__row')
			const used = row?.querySelector(`[data-move="${direction}"]`)
			const other = row?.querySelector(`[data-move="${direction === 'up' ? 'down' : 'up'}"]`)
			const target = used && !used.disabled ? used : other
			target?.focus()
		},

		/**
		 * Select a node. Emits `@select` + `update:selected-id`.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		selectNode(node) {
			// Description above the tag — see the note on `update:expanded-ids`.
			/**
			 * `v-model:selected-id` counterpart. Payload is the new id (or null).
			 *
			 * @event update:selected-id
			 */
			this.$emit('update:selected-id', node[this.idKey])
			/**
			 * @event select Emitted on row click. Payload is the
			 *   selected node object.
			 * @type {object}
			 */
			this.$emit('select', node)
		},

		/**
		 * Programmatically expand every node in the tree.
		 *
		 * @return {void}
		 */
		expandAll() {
			const ids = []
			const walk = (n) => {
				ids.push(n[this.idKey])
				const cs = n[this.childrenKey]
				if (Array.isArray(cs)) {
					cs.forEach(walk)
				}
			}
			this.safeNodes.forEach(walk)
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:expanded-ids <description>` is read as one long
			// event NAME and the generated docs show an empty description.
			/**
			 * `v-model:expanded-ids` counterpart. Payload is the new full set.
			 *
			 * @event update:expanded-ids
			 */
			this.$emit('update:expanded-ids', ids)
		},

		/**
		 * Programmatically collapse every node.
		 *
		 * @return {void}
		 */
		collapseAll() {
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:expanded-ids <description>` is read as one long
			// event NAME and the generated docs show an empty description.
			/**
			 * `v-model:expanded-ids` counterpart. Payload is the new full set.
			 *
			 * @event update:expanded-ids
			 */
			this.$emit('update:expanded-ids', [])
		},
	},
}
</script>

<style scoped>
.cn-tree-view {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-tree-view__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-tree-view__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-tree-view__status {
	color: var(--color-text-maxcontrast);
	margin: 8px 0 0;
}

.cn-tree-view__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}

.cn-tree-view__root {
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
