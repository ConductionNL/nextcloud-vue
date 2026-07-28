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
			:style="{ paddingLeft: (depth * indent) + 'px' }"
			@click="onRowClick">
			<button v-if="hasChildren"
				type="button"
				class="cn-tree-node__toggle"
				:aria-label="isExpanded ? collapseLabel : expandLabel"
				@click.stop="toggle">
				<span class="cn-tree-node__caret" :class="{ 'cn-tree-node__caret--open': isExpanded }">▸</span>
			</button>
			<span v-else class="cn-tree-node__toggle cn-tree-node__toggle--leaf" />

			<span v-if="node.icon" class="cn-tree-node__icon">{{ node.icon }}</span>
			<span class="cn-tree-node__label">{{ node[labelKey] }}</span>
			<span v-if="node.badge !== undefined" class="cn-tree-node__badge">{{ node.badge }}</span>

			<!-- @slot actions Inline per-row actions slot. Scope:
			     { node, depth }. -->
			<slot name="actions" :node="node" :depth="depth" />
		</div>

		<ul v-if="hasChildren && isExpanded" class="cn-tree-node__children" role="group">
			<CnTreeNode v-for="child in node[childrenKey]"
				:key="child[idKey]"
				:node="child"
				:depth="depth + 1"
				:indent="indent"
				:expanded-ids="expandedIds"
				:selected-id="selectedId"
				:id-key="idKey"
				:label-key="labelKey"
				:children-key="childrenKey"
				:expand-label="expandLabel"
				:collapse-label="collapseLabel"
				@toggle="$emit('toggle', $event)"
				@select="$emit('select', $event)">
				<template #actions="scope">
					<slot name="actions" v-bind="scope" />
				</template>
			</CnTreeNode>
		</ul>
	</li>
</template>

<script>
/**
 * CnTreeNode — Recursive tree row used inside CnTreeView. Renders
 * its own row + recurses for children when expanded. Not exported
 * as a separate barrel entry — consumers use CnTreeView and the
 * recursion is internal.
 */
export default {
	name: 'CnTreeNode',
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
		/** A11y label for the expand button. */
		expandLabel: { type: String, default: 'Expand' },
		/** A11y label for the collapse button. */
		collapseLabel: { type: String, default: 'Collapse' },
	},
	computed: {
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
	},
	methods: {
		toggle() {
			this.$emit('toggle', this.node[this.idKey])
		},
		onRowClick() {
			this.$emit('select', this.node)
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
