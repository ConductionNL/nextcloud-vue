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

		<ul v-else class="cn-tree-view__root" role="tree">
			<CnTreeNode v-for="node in safeNodes"
				:key="node[idKey]"
				:node="node"
				:depth="0"
				:indent="indent"
				:expanded-ids="expandedMap"
				:selected-id="selectedId"
				:id-key="idKey"
				:label-key="labelKey"
				:children-key="childrenKey"
				:expand-label="expandLabel"
				:collapse-label="collapseLabel"
				@toggle="toggleNode"
				@select="selectNode">
				<template #actions="scope">
					<!-- @slot actions Per-row actions. Scope:
					     { node, depth }. -->
					<slot name="actions" v-bind="scope" />
				</template>
			</CnTreeNode>
		</ul>
	</div>
</template>

<script>
import CnTreeNode from './CnTreeNode.vue'

/**
 * CnTreeView — Recursive hierarchical tree widget. Renders nested
 * nodes with click-to-expand carets, optional badges + icons,
 * inline per-row actions slot, and select-on-click semantics.
 *
 * Drag-drop reorder is intentionally a follow-up (issue #278).
 * The widget's public contract (props, events, selection model)
 * is forward-compatible — adding `draggable: true` later won't
 * touch existing v-model bindings.
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
 */
export default {
	name: 'CnTreeView',
	components: { CnTreeNode },
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
		/** A11y label for the expand button. */
		expandLabel: { type: String, default: 'Expand' },
		/** A11y label for the collapse button. */
		collapseLabel: { type: String, default: 'Collapse' },
		/** Expand all nodes on mount. */
		expandAllOnMount: { type: Boolean, default: false },
	},
	computed: {
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
			for (const id of this.expandedIds) out[id] = true
			return out
		},
	},
	mounted() {
		if (this.expandAllOnMount) {
			const ids = []
			const walk = (n) => {
				ids.push(n[this.idKey])
				const cs = n[this.childrenKey]
				if (Array.isArray(cs)) cs.forEach(walk)
			}
			this.safeNodes.forEach(walk)
			/**
			 * @event update:expanded-ids `.sync` of `expandedIds`. Payload is the new full set.
			 */
			this.$emit('update:expanded-ids', ids)
		}
	},
	methods: {
		/**
		 * Toggle a node's expanded state by id. Emits
		 * `update:expanded-ids` with the new array.
		 *
		 * @param {*} id Node id.
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
			/**
			 * @event update:expanded-ids `.sync` of `expandedIds`. Payload is the new full set.
			 */
			this.$emit('update:expanded-ids', next)
		},
		/**
		 * Select a node. Emits `@select` + `update:selected-id`.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		selectNode(node) {
			/**
			 * @event update:selected-id `.sync` of `selectedId`. Payload is the new id (or null).
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
				if (Array.isArray(cs)) cs.forEach(walk)
			}
			this.safeNodes.forEach(walk)
			/**
			 * @event update:expanded-ids `.sync` of `expandedIds`. Payload is the new full set.
			 */
			this.$emit('update:expanded-ids', ids)
		},
		/**
		 * Programmatically collapse every node.
		 *
		 * @return {void}
		 */
		collapseAll() {
			/**
			 * @event update:expanded-ids `.sync` of `expandedIds`. Payload is the new full set.
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
