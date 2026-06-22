<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<li
		class="cn-menu-tree-node"
		:class="`cn-menu-tree-node--depth-${depth}`"
		role="treeitem"
		:aria-expanded="hasChildren ? String(expanded) : null">
		<div
			class="cn-menu-tree-node__row"
			:class="rowClass"
			:style="rowStyle">
			<button
				v-if="hasChildren"
				type="button"
				class="cn-menu-tree-node__caret"
				:class="{ 'cn-menu-tree-node__caret--open': expanded }"
				:aria-label="expanded ? t('nextcloud-vue', 'Collapse') : t('nextcloud-vue', 'Expand')"
				@click.stop="toggle">
				<span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
			</button>
			<span v-else class="cn-menu-tree-node__caret-spacer" />
			<button
				type="button"
				class="cn-menu-tree-node__label-button"
				@click="onLabelClick"
				@keydown.right.prevent="onArrowRight"
				@keydown.left.prevent="onArrowLeft">
				<span v-if="showIcons" class="cn-menu-tree-node__icon" :class="{ 'cn-menu-tree-node__icon--hidden': !item.icon }">
					<CnMenuItemIcon v-if="item.icon" :icon="item.icon" />
				</span>
				<span class="cn-menu-tree-node__label">{{ item.label }}</span>
			</button>
		</div>
		<ul
			v-if="hasChildren && expanded"
			class="cn-menu-tree-node__children"
			role="group">
			<CnMenuTreeNode
				v-for="(child, idx) in item.children"
				:key="`tree-child-${idx}`"
				:item="child"
				:depth="depth + 1"
				:show-icons="showIcons"
				:expanded-by-default="expandedByDefault"
				:active-path="activePath"
				:active-leaf-key="activeLeafKey"
				:current-key="`${currentKey}.${idx}`"
				:active-highlight="activeHighlight"
				@navigate="$emit('navigate', $event)" />
		</ul>
	</li>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnMenuItemIcon from './CnMenuItemIcon.vue'

/**
 * CnMenuTreeNode — recursive tree-style row used by {@link CnMenuWidget} when
 * `style === 'tree'`. The caret toggles children; the label routes to the
 * parent's navigation handler. Active-state classes come from the dotted-key
 * path map computed once in the parent.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnMenuTreeNode',

	components: {
		CnMenuItemIcon,
	},

	props: {
		/** Single menu item `{label, url, icon, children}`. */
		item: {
			type: Object,
			required: true,
		},
		/** 1-indexed depth — drives indentation. */
		depth: {
			type: Number,
			default: 1,
		},
		/** When false, all icon slots collapse to invisible spacers. */
		showIcons: {
			type: Boolean,
			default: true,
		},
		/** When true, every node mounts already expanded. */
		expandedByDefault: {
			type: Boolean,
			default: false,
		},
		/**
		 * Dotted-key map of `'active' | 'in-path'` flags.
		 *
		 * @type {Record<string, 'active'|'in-path'>}
		 */
		activePath: {
			type: Object,
			default: () => ({}),
		},
		/** Key of the deepest active leaf; used to disambiguate ties. */
		activeLeafKey: {
			type: String,
			default: null,
		},
		/** Key of THIS node within the parent's path map. */
		currentKey: {
			type: String,
			required: true,
		},
		/** Highlight style — drives the row class. */
		activeHighlight: {
			type: String,
			default: 'underline',
		},
	},

	emits: [
		/**
		 * Fired when a leaf is activated; payload is the menu item.
		 *
		 * @type {object}
		 */
		'navigate',
	],

	data() {
		return {
			expanded: this.expandedByDefault,
		}
	},

	computed: {
		/**
		 * Whether this item has at least one child row.
		 *
		 * @return {boolean} true when `item.children` is non-empty.
		 */
		hasChildren() {
			return Array.isArray(this.item?.children) && this.item.children.length > 0
		},

		/**
		 * The active state for this node (`active` / `in-path` / `''`).
		 *
		 * @return {string} the row state.
		 */
		rowState() {
			if (this.currentKey === this.activeLeafKey) {
				return 'active'
			}
			return this.activePath[this.currentKey] || ''
		},

		/**
		 * The active-state CSS class for the row.
		 *
		 * @return {string} the row class.
		 */
		rowClass() {
			if (this.rowState === 'active') {
				return 'cn-menu-widget__item--active'
			}
			if (this.rowState === 'in-path') {
				return 'cn-menu-widget__item--in-path'
			}
			return ''
		},

		/**
		 * Depth-proportional left indent style.
		 *
		 * @return {{paddingLeft: string}} the row style.
		 */
		rowStyle() {
			return { paddingLeft: `${(this.depth - 1) * 20}px` }
		},
	},

	methods: {
		/**
		 * Toggle the expanded state.
		 *
		 * @return {void}
		 */
		toggle() {
			this.expanded = !this.expanded
		},

		/**
		 * Label click — navigate when the item has a URL, else toggle children.
		 *
		 * @return {void}
		 */
		onLabelClick() {
			if (typeof this.item?.url === 'string' && this.item.url !== '') {
				this.$emit('navigate', this.item)
				return
			}
			if (this.hasChildren) {
				this.toggle()
			}
		},

		/**
		 * ArrowRight — expand a collapsed node.
		 *
		 * @return {void}
		 */
		onArrowRight() {
			if (this.hasChildren && !this.expanded) {
				this.expanded = true
			}
		},

		/**
		 * ArrowLeft — collapse an expanded node.
		 *
		 * @return {void}
		 */
		onArrowLeft() {
			if (this.hasChildren && this.expanded) {
				this.expanded = false
			}
		},
	},
}
</script>

<style scoped>
.cn-menu-tree-node {
	list-style: none;
}

.cn-menu-tree-node__row {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-menu-tree-node__row:hover {
	background: var(--color-background-hover);
}

.cn-menu-tree-node__caret,
.cn-menu-tree-node__caret-spacer {
	width: 18px;
	height: 18px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	cursor: pointer;
	color: inherit;
	font-size: 12px;
	padding: 0;
}

.cn-menu-tree-node__caret-spacer {
	cursor: default;
}

.cn-menu-tree-node__label-button {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: transparent;
	border: none;
	cursor: pointer;
	color: inherit;
	font-size: 14px;
	text-align: left;
	padding: 2px 4px;
	flex: 1;
}

.cn-menu-tree-node__label-button:focus-visible {
	outline: 2px solid var(--color-primary);
	outline-offset: 1px;
}

.cn-menu-tree-node__icon {
	display: inline-flex;
	width: 20px;
	height: 20px;
}

.cn-menu-tree-node__icon--hidden {
	visibility: hidden;
}

.cn-menu-tree-node__children {
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
