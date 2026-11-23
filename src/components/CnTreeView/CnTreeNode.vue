<template>
	<li class="cn-tree-node"
		:class="{
			'cn-tree-node--selected': isSelected,
			'cn-tree-node--expanded': isExpanded,
		}"
		:data-node-id="node[idKey]"
		role="treeitem"
		:aria-expanded="hasChildren ? isExpanded : undefined"
		:aria-selected="isSelected">
		<div class="cn-tree-node__row"
			v-bind="extraRowAttrs"
			:style="{ paddingLeft: (depth * indent) + 'px' }"
			:tabindex="focusableRows ? 0 : undefined"
			@click="onRowClick"
			@keydown="onRowKeydown">
			<span v-for="key in reorderSlots"
				:key="key"
				class="cn-tree-node__handle"
				:title="reorderLabels.drag"
				aria-hidden="true"
				@click.stop>
				<DragVertical :size="18" />
			</span>
			<button v-if="hasChildren"
				type="button"
				v-bind="extraToggleAttrs"
				class="cn-tree-node__toggle"
				:aria-label="toggleLabel"
				@click.stop="toggle">
				<span class="cn-tree-node__caret" :class="{ 'cn-tree-node__caret--open': isExpanded }">▸</span>
			</button>
			<span v-else class="cn-tree-node__toggle cn-tree-node__toggle--leaf" />

			<span v-if="node.icon" class="cn-tree-node__icon">{{ node.icon }}</span>
			<span class="cn-tree-node__label">
				<!-- @slot label The row's label. Scope: { node, depth, expanded }. Defaults to the node's label text. -->
				<slot name="label"
					:node="node"
					:depth="depth"
					:expanded="isExpanded">{{ node[labelKey] }}</slot>
			</span>
			<span v-if="node.badge !== undefined" class="cn-tree-node__badge">{{ node.badge }}</span>

			<span v-for="key in reorderSlots"
				:key="key"
				class="cn-tree-node__move"
				@click.stop>
				<NcButton variant="tertiary"
					:disabled="siblingIndex === 0"
					:aria-label="moveName(reorderLabels.moveUp)"
					data-move="up"
					@click="moveBy(-1)">
					{{ reorderLabels.moveUp }}
				</NcButton>
				<NcButton variant="tertiary"
					:disabled="siblingIndex >= siblingCount - 1"
					:aria-label="moveName(reorderLabels.moveDown)"
					data-move="down"
					@click="moveBy(1)">
					{{ reorderLabels.moveDown }}
				</NcButton>
			</span>

			<!-- @slot actions Inline per-row actions slot. Scope:
			     { node, depth }. -->
			<slot name="actions" :node="node" :depth="depth" />
		</div>

		<Draggable v-if="reorderable && hasChildren && isExpanded"
			:modelValue="node[childrenKey]"
			:itemKey="idKey"
			tag="ul"
			class="cn-tree-node__children"
			role="group"
			handle=".cn-tree-node__handle"
			@change="onDragChange">
			<template #item="{ element: child, index }">
				<CnTreeNode :node="child"
					:depth="depth + 1"
					:indent="indent"
					:expandedIds="expandedIds"
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
					:reorderLabels="reorderLabels"
					:parentId="node[idKey]"
					:siblingIndex="index"
					:siblingCount="node[childrenKey].length"
					@toggle="$emit('toggle', $event)"
					@select="$emit('select', $event)"
					@move="$emit('move', $event)">
					<template #actions="scope">
						<slot name="actions" v-bind="scope" />
					</template>
					<template v-if="$slots.label" #label="scope">
						<slot name="label" v-bind="scope" />
					</template>
				</CnTreeNode>
			</template>
		</Draggable>
		<ul v-else-if="hasChildren && isExpanded" class="cn-tree-node__children" role="group">
			<CnTreeNode v-for="child in node[childrenKey]"
				:key="child[idKey]"
				:node="child"
				:depth="depth + 1"
				:indent="indent"
				:expandedIds="expandedIds"
				:selectedId="selectedId"
				:idKey="idKey"
				:labelKey="labelKey"
				:childrenKey="childrenKey"
				:expandLabel="expandLabel"
				:collapseLabel="collapseLabel"
				:toggleAttrs="toggleAttrs"
				:rowAttrs="rowAttrs"
				:focusableRows="focusableRows"
				@toggle="$emit('toggle', $event)"
				@select="$emit('select', $event)">
				<template #actions="scope">
					<slot name="actions" v-bind="scope" />
				</template>
				<template v-if="$slots.label" #label="scope">
					<slot name="label" v-bind="scope" />
				</template>
			</CnTreeNode>
		</ul>
	</li>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import Draggable from 'vuedraggable'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'

/**
 * CnTreeNode — Recursive tree row used inside CnTreeView. Renders
 * its own row + recurses for children when expanded. Not exported
 * as a separate barrel entry — consumers use CnTreeView and the
 * recursion is internal.
 */
export default {
	name: 'CnTreeNode',
	components: { Draggable, DragVertical, NcButton },
	props: {
		/** The node data. */
		node: { type: Object, required: true },
		/** Depth (drives indent). */
		depth: { type: Number, default: 0 },
		/** Pixels of padding per depth level. */
		indent: { type: Number, default: 18 },
		/** Set of expanded node ids. */
		expandedIds: { type: Object, required: true },
		/** Currently selected node id, read off `node[idKey]` (or null). */
		selectedId: { type: [String, Number], default: null },
		/** Node-field key for the id. */
		idKey: { type: String, default: 'id' },
		/** Node-field key for the display label. */
		labelKey: { type: String, default: 'label' },
		/** Node-field key for the children array. */
		childrenKey: { type: String, default: 'children' },
		/** A11y label for the expand button, or `(node) => string`. */
		expandLabel: { type: [String, Function], default: 'Expand' },
		/** A11y label for the collapse button, or `(node) => string`. */
		collapseLabel: { type: [String, Function], default: 'Collapse' },
		/** Extra expand-button attributes per node, `(node, depth) => object`. */
		toggleAttrs: { type: Function, default: null },
		/** Extra row attributes per node, `(node, depth) => object`. */
		rowAttrs: { type: Function, default: null },
		/** Rows take focus and select on Enter or Space. */
		focusableRows: { type: Boolean, default: false },
		/** Rows can be moved among their siblings. */
		reorderable: { type: Boolean, default: false },
		/** The texts of the move controls, resolved by CnTreeView. */
		reorderLabels: { type: Object, default: () => ({}) },
		/** The parent's id, or null at the root. */
		parentId: { type: [String, Number], default: null },
		/** This node's index among its siblings. */
		siblingIndex: { type: Number, default: 0 },
		/** How many siblings there are, itself included. */
		siblingCount: { type: Number, default: 1 },
	},

	emits: ['select', 'toggle', 'move'],
	computed: {
		/**
		 * One entry when the row draws its move controls. A `v-for` leaves no
		 * placeholder in the markup when off, which `v-if` would.
		 *
		 * @return {string[]} The keys.
		 */
		reorderSlots() {
			return this.reorderable ? ['reorder'] : []
		},

		/**
		 * Whether this node has any children at all.
		 *
		 * @return {boolean}
		 */
		hasChildren() {
			const c = this.node[this.childrenKey]
			return Array.isArray(c) && c.length > 0
		},

		/**
		 * Whether this node is currently expanded.
		 *
		 * @return {boolean}
		 */
		isExpanded() {
			return Boolean(this.expandedIds[this.node[this.idKey]])
		},

		/**
		 * Whether this node is the currently-selected one.
		 *
		 * @return {boolean}
		 */
		isSelected() {
			return this.selectedId === this.node[this.idKey]
		},

		/**
		 * The expand button's accessible name for this node.
		 *
		 * @return {string}
		 */
		toggleLabel() {
			const label = this.isExpanded ? this.collapseLabel : this.expandLabel
			return typeof label === 'function' ? label(this.node) : label
		},

		/**
		 * The host's extra attributes for this row.
		 *
		 * @return {object}
		 */
		extraRowAttrs() {
			return this.rowAttrs ? this.rowAttrs(this.node, this.depth) : {}
		},

		/**
		 * The host's extra attributes for this row's expand button.
		 *
		 * @return {object}
		 */
		extraToggleAttrs() {
			return this.toggleAttrs ? this.toggleAttrs(this.node, this.depth) : {}
		},
	},

	methods: {
		toggle() {
			this.$emit('toggle', this.node[this.idKey])
		},

		/**
		 * The accessible name of a move button: its visible label and the node's.
		 *
		 * @param {string} action The visible label.
		 * @return {string} The name.
		 */
		moveName(action) {
			return this.reorderLabels.controlName
				.replace('{action}', action)
				.replace('{label}', String(this.node[this.labelKey] ?? ''))
		},

		/**
		 * Move this node one place among its siblings, with a button.
		 *
		 * @param {number} delta -1 up, 1 down.
		 * @return {void}
		 */
		moveBy(delta) {
			this.$emit('move', {
				node: this.node,
				parentId: this.parentId,
				from: this.siblingIndex,
				to: this.siblingIndex + delta,
				byButton: true,
			})
		},

		/**
		 * A child was dragged to another place.
		 *
		 * @param {{moved?: {element: object, oldIndex: number, newIndex: number}}} change What the drag changed.
		 * @return {void}
		 */
		onDragChange({ moved } = {}) {
			if (moved) {
				this.$emit('move', { node: moved.element, parentId: this.node[this.idKey], from: moved.oldIndex, to: moved.newIndex })
			}
		},

		onRowClick() {
			this.$emit('select', this.node)
		},

		/**
		 * Enter or Space on a focusable row selects its node. Keys pressed on
		 * the expand button or an action inside the row are theirs.
		 *
		 * @param {KeyboardEvent} event The key event.
		 */
		onRowKeydown(event) {
			if (!this.focusableRows || event.target !== event.currentTarget) {
				return
			}
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				this.$emit('select', this.node)
			}
		},
	},
}
</script>

<style scoped>
.cn-tree-node {
	list-style: none;
}

.cn-tree-node__row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 6px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-tree-node__row:hover {
	background: var(--color-background-hover);
}

/* A row made focusable by `focusableRows` shows where keyboard focus is (WCAG 2.4.7). */
.cn-tree-node__row[tabindex]:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-tree-node--selected > .cn-tree-node__row {
	background: var(--color-primary-element-light);
	color: var(--color-main-text);
}

.cn-tree-node__toggle {
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	width: 18px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.cn-tree-node__toggle--leaf {
	cursor: default;
}

.cn-tree-node__caret {
	display: inline-block;
	transition: transform 0.15s ease;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
}

.cn-tree-node__caret--open {
	transform: rotate(90deg);
	color: var(--color-main-text);
}

.cn-tree-node__icon {
	font-size: 0.9em;
}

.cn-tree-node__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-tree-node__handle {
	color: var(--color-text-maxcontrast);
	cursor: grab;
	display: inline-flex;
}

.cn-tree-node__move {
	display: inline-flex;
	gap: 4px;
}

.cn-tree-node__badge {
	font-size: 0.8em;
	padding: 1px 6px;
	border-radius: 9999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.cn-tree-node__children {
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
