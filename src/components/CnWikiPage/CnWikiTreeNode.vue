<!--
  CnWikiTreeNode — Recursive tree-node helper for CnWikiPage's
  sidebar. Internal to the CnWikiPage barrel; kept as its own SFC so
  the recursion is straightforward (Vue 2's recursive functional
  components are awkward).

  Renders one `<li>` with a `<button>` for the node label and a
  nested `<ul>` of `CnWikiTreeNode` for `node[treeField]` children.
  Click events bubble up through `@click` so the parent CnWikiPage
  can re-emit `@tree-click` with the leaf node.
-->
<template>
	<li class="cn-wiki-tree-node">
		<button
			type="button"
			class="cn-wiki-tree-node__button"
			@click="onClick">
			{{ label }}
		</button>
		<ul v-if="hasChildren" class="cn-wiki-tree-node__children">
			<CnWikiTreeNode
				v-for="child in children"
				:key="childKey(child)"
				:node="child"
				:title-field="titleField"
				:tree-field="treeField"
				@click="bubble" />
		</ul>
	</li>
</template>

<script>
export default {
	name: 'CnWikiTreeNode',

	props: {
		/**
		 * The tree node this row represents. Read via `node[titleField]`
		 * for the label and `node[treeField]` for the children array.
		 *
		 * @type {object}
		 */
		node: {
			type: Object,
			required: true,
		},

		/** Property holding the node label. */
		titleField: {
			type: String,
			default: 'title',
		},

		/** Property holding the children array. */
		treeField: {
			type: String,
			default: 'children',
		},
	},

	emits: [
		/**
		 * Emitted with the leaf node (NOT the chain of ancestors)
		 * whenever any node in the subtree is clicked. The parent
		 * CnWikiPage re-emits this as `@tree-click`.
		 */
		'click',
	],

	computed: {
		/** Resolved label text — falls back to the empty string. */
		label() {
			const value = this.node?.[this.titleField]
			return typeof value === 'string' ? value : ''
		},

		/** Children array, or empty for leaves. */
		children() {
			const value = this.node?.[this.treeField]
			return Array.isArray(value) ? value : []
		},

		/** Whether the node has children. */
		hasChildren() {
			return this.children.length > 0
		},
	},

	methods: {
		/** Click handler — emits the node up to the parent. */
		onClick() {
			this.$emit('click', this.node)
		},

		/**
		 * Bubble a child's click event up unchanged so the original
		 * leaf node arrives at the CnWikiPage `@tree-click` listener.
		 *
		 * @param {object} node The leaf node a descendant emitted.
		 */
		bubble(node) {
			this.$emit('click', node)
		},

		/**
		 * Stable v-for key for nested children.
		 *
		 * @param {object} child Child node.
		 * @return {string}
		 */
		childKey(child) {
			if (!child) return ''
			if (typeof child.id === 'string' || typeof child.id === 'number') return String(child.id)
			const title = child[this.titleField]
			return typeof title === 'string' ? title : JSON.stringify(child)
		},
	},
}
</script>

<style scoped>
.cn-wiki-tree-node {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-wiki-tree-node__button {
	display: block;
	width: 100%;
	text-align: left;
	background: transparent;
	border: 0;
	color: var(--color-main-text);
	padding: 6px 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-wiki-tree-node__button:hover,
.cn-wiki-tree-node__button:focus-visible {
	background: var(--color-background-hover);
	outline: none;
}

.cn-wiki-tree-node__children {
	list-style: none;
	margin: 0;
	padding-left: 16px;
}
</style>
