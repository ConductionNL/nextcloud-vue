<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-stat-grid"
		:style="{ '--cn-stat-grid-columns': columnCount }"
		data-testid="cn-stat-grid">
		<CnStatWidget
			v-for="cell in shownCells"
			:key="cell.key"
			class="cn-stat-grid__cell"
			:content="cell.content" />
	</div>
</template>

<script>
import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'
import { CnStatWidget } from '../CnStatWidget/index.js'

/**
 * CnStatGridWidget — the `stat-grid` widget: several figures in a grid inside
 * one card (DqDagAfsluiten "Uw dag").
 *
 * Each cell is a stat (`label`, `valueField`, `caption`, `format`, …) drawn
 * flat and stacked. The cells read the grid's `endpointSource`, and a cell
 * that names its own `endpointSource` reads that instead, so one figure can
 * come from another app. A cell with `visibleWhen` shows only once the
 * condition holds; a condition that fails or cannot be read hides it.
 */
export default {
	name: 'CnStatGridWidget',

	components: { CnStatWidget },

	inject: {
		/** Detail-page object context, for `@objectId` in a condition. */
		cnObjectContext: { default: null },
	},

	props: {
		/**
		 * `{ columns?: number, endpointSource?: object, cells: Array<object> }`.
		 * A cell is a stat's content plus `endpointSource?` and `visibleWhen?`.
		 *
		 * @type {{columns?: number, endpointSource?: object, cells?: Array<object>}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			// Cell index to whether its `visibleWhen` held.
			allowed: {},
		}
	},

	computed: {
		/** @return {number} The columns, 1 to 4; 2 by default. */
		columnCount() {
			const n = Math.floor(Number(this.content?.columns))
			return Number.isFinite(n) && n >= 1 ? Math.min(n, 4) : 2
		},

		/**
		 * The cells, each as the content its stat draws.
		 *
		 * @return {Array<{key: string, index: number, gated: boolean, content: object}>}
		 * @spec openspec/changes/stat-grid-widget/specs/stat-grid-widget/spec.md#requirement-a-stat-grid-draws-figures-from-a-shared-or-their-own-source
		 */
		cells() {
			const list = Array.isArray(this.content?.cells) ? this.content.cells : []
			return list
				.map((cell, index) => ({ cell, index }))
				.filter(({ cell }) => cell && typeof cell === 'object')
				.map(({ cell, index }) => {
					const { visibleWhen, key, endpointSource, ...stat } = cell
					return {
						key: String(key || index),
						index,
						gated: Boolean(visibleWhen),
						condition: visibleWhen,
						content: {
							...stat,
							endpointSource: endpointSource || this.content.endpointSource,
							layout: 'stacked',
							flat: true,
						},
					}
				})
		},

		/**
		 * The cells to draw: every ungated cell, and a gated one once its
		 * condition held.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/stat-grid-widget/specs/stat-grid-widget/spec.md#requirement-a-cell-can-show-only-while-a-condition-holds
		 */
		shownCells() {
			return this.cells.filter((cell) => !cell.gated || this.allowed[cell.index] === true)
		},
	},

	watch: {
		cells: {
			handler() {
				this.evaluate()
			},

			immediate: true,
		},
	},

	methods: {
		/**
		 * Evaluate every gated cell's condition; a failed read hides the cell.
		 *
		 * @return {Promise<void>}
		 */
		async evaluate() {
			const ctx = { objectId: this.cnObjectContext?.objectId, object: this.cnObjectContext?.object }
			await Promise.all(this.cells.filter((cell) => cell.gated).map(async (cell) => {
				let shown
				try {
					shown = (await evaluateVisibleWhen(cell.condition, ctx)) === true
				} catch {
					shown = false
				}
				this.allowed = { ...this.allowed, [cell.index]: shown }
			}))
		},
	},
}
</script>

<style scoped>
.cn-stat-grid {
	display: grid;
	grid-template-columns: repeat(var(--cn-stat-grid-columns, 2), minmax(0, 1fr));
	gap: 16px 20px;
}
</style>
