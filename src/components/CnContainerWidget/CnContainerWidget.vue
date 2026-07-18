<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-container-widget" :style="wrapperStyle">
		<h4 v-if="hasTitle" class="cn-container-widget__title">
			{{ titleText }}
		</h4>

		<div ref="innerGrid" class="grid-stack cn-container-widget__grid">
			<div
				v-for="(child, index) in children"
				:key="childKey(child, index)"
				class="grid-stack-item cn-container-widget__child"
				:gs-x="child.gridX || 0"
				:gs-y="child.gridY || 0"
				:gs-w="child.gridWidth || 2"
				:gs-h="child.gridHeight || 2"
				:data-cn-container-index="index">
				<div class="grid-stack-item-content">
					<CnContainerChild
						:placement="child"
						:edit-mode="editMode" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import CnContainerChild from './CnContainerChild.vue'

const PADDING_TOKENS = Object.freeze({
	none: '0',
	small: '4px',
	medium: '8px',
	large: '16px',
})

// Inner (nested) GridStack configuration — a smaller grid than the outer one
// so child widgets fit inside a typical container cell.
const NESTED_GRID_OPTIONS = Object.freeze({
	column: 4,
	cellHeight: 40,
	margin: 4,
	acceptWidgets: true,
	disableOneColumnMode: true,
})

/**
 * CnContainerWidget — the `container` dashboard widget renderer.
 *
 * Renders a wrapper with optional background colour, padding, and title, plus
 * an inner GridStack instance bounded by the container's outer cell. Each child
 * placement in `content.placements[]` renders through {@link CnContainerChild},
 * which dispatches by widget type via the shared dashboardWidgetRegistry — so a
 * container can hold any registered widget type, including another container.
 * The renderer renders whatever depth it is handed; it does NOT enforce a
 * nesting cap (that is a consumer/server concern).
 *
 * In view mode the wrapper is `pointer-events: none` so clicks fall through to
 * the child under the cursor (child wrappers re-enable pointer events); in edit
 * mode the inner grid is interactive. Inner-grid moves/resizes emit
 * `update:content` so the parent can persist the updated `placements[]`.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnContainerWidget',

	components: {
		CnContainerChild,
	},

	props: {
		/**
		 * Persisted content `{placements, backgroundColor, padding, title}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the surrounding dashboard shell is in edit mode. */
		editMode: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * Emitted with the updated content when a child is moved/resized.
		 *
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		return {
			gridInstance: null,
		}
	},

	computed: {
		/**
		 * The child placements.
		 *
		 * @return {object[]} the placements array.
		 */
		children() {
			const list = this.content?.placements
			return Array.isArray(list) ? list : []
		},

		/**
		 * The container background colour (default `transparent`).
		 *
		 * @return {string} the colour.
		 */
		backgroundColor() {
			const value = this.content?.backgroundColor
			return (typeof value === 'string' && value !== '') ? value : 'transparent'
		},

		/**
		 * The validated padding token (default `medium`).
		 *
		 * @return {string} one of none/small/medium/large.
		 */
		paddingToken() {
			const value = this.content?.padding
			if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(PADDING_TOKENS, value)) {
				return value
			}
			return 'medium'
		},

		/**
		 * The pixel padding for the current token.
		 *
		 * @return {string} the CSS padding value.
		 */
		paddingPx() {
			return PADDING_TOKENS[this.paddingToken]
		},

		/**
		 * The container title text.
		 *
		 * @return {string} the title, or `''`.
		 */
		titleText() {
			return typeof this.content?.title === 'string' ? this.content.title : ''
		},

		/**
		 * Whether a non-empty title is set.
		 *
		 * @return {boolean} true when a title renders.
		 */
		hasTitle() {
			return this.titleText.trim() !== ''
		},

		/**
		 * Inline style for the container wrapper.
		 *
		 * @return {object} the wrapper style.
		 */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				padding: this.paddingPx,
				'background-color': this.backgroundColor,
				'pointer-events': this.editMode ? 'auto' : 'none',
			}
		},
	},

	mounted() {
		this.initInnerGrid()
	},

	beforeUnmount() {
		this.destroyInnerGrid()
	},

	methods: {
		/**
		 * Stable v-for key for a child placement (id → uuid → index).
		 *
		 * @param {object} child the child placement.
		 * @param {number} index the loop index.
		 * @return {string} the key.
		 */
		childKey(child, index) {
			if (child && (child.id !== undefined && child.id !== null)) {
				return `id-${child.id}`
			}
			if (child && typeof child.uuid === 'string' && child.uuid !== '') {
				return `uuid-${child.uuid}`
			}
			return `idx-${index}`
		},

		/**
		 * Initialise the inner GridStack instance via a dynamic import so the
		 * unit-test surface stays JSDOM-friendly (the renderer still mounts and
		 * renders children when GridStack is unavailable).
		 *
		 * @return {Promise<void>}
		 */
		async initInnerGrid() {
			if (!this.$refs.innerGrid) {
				return
			}
			let GridStackCtor = null
			try {
				const mod = await import('gridstack')
				GridStackCtor = mod && (mod.GridStack || mod.default)
			} catch (e) {
				// GridStack runtime unavailable — non-fatal in tests.
				return
			}
			if (!GridStackCtor || typeof GridStackCtor.init !== 'function') {
				return
			}
			this.gridInstance = GridStackCtor.init({ ...NESTED_GRID_OPTIONS }, this.$refs.innerGrid)
			if (this.gridInstance && typeof this.gridInstance.on === 'function') {
				this.gridInstance.on('change', this.onGridChange)
			}
		},

		/**
		 * GridStack 'change' callback — maps inner-grid node coordinates back
		 * into the LaunchPad field-name form and emits `update:content`.
		 *
		 * @param {Event} _event the GridStack event (ignored).
		 * @param {Array<object>} nodes the changed nodes.
		 * @return {void}
		 */
		onGridChange(_event, nodes) {
			if (!Array.isArray(nodes) || nodes.length === 0) {
				return
			}
			const updated = this.children.map((child, index) => {
				const node = nodes.find((n) => n.el && n.el.dataset && n.el.dataset.cnContainerIndex === String(index))
				if (!node) {
					return child
				}
				return {
					...child,
					gridX: node.x,
					gridY: node.y,
					gridWidth: node.w,
					gridHeight: node.h,
				}
			})
			this.handlePersist(updated)
		},

		/**
		 * Re-emit `update:content` with the merged placements.
		 *
		 * @param {Array<object>} placements the new child placements.
		 * @return {void}
		 */
		handlePersist(placements) {
			this.$emit('update:content', {
				...(this.content || {}),
				placements: Array.isArray(placements) ? placements : [],
			})
		},

		/**
		 * Best-effort teardown of the inner GridStack instance.
		 *
		 * @return {void}
		 */
		destroyInnerGrid() {
			if (this.gridInstance && typeof this.gridInstance.destroy === 'function') {
				try {
					this.gridInstance.destroy(false)
				} catch (e) {
					// no-op — best-effort teardown
				}
			}
			this.gridInstance = null
		},
	},
}
</script>

<style scoped>
.cn-container-widget {
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 4px;
	overflow: hidden;
}

.cn-container-widget__title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-maxcontrast, var(--color-main-text));
	pointer-events: auto;
}

.cn-container-widget__grid {
	flex: 1;
	min-height: 0;
}

.cn-container-widget__child {
	/* In view mode the container is pointer-events:none; child wrappers
	   re-enable pointer events so clicks reach the child's own handlers. */
	pointer-events: auto;
}
</style>
