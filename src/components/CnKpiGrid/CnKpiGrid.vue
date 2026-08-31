<template>
	<div class="cn-kpi-grid" :class="gridClasses">
		<slot />
	</div>
</template>

<script>
// The canonical KPI scale (`--cn-kpi-*`) lives in one stylesheet. Imported
// here as well as from css/index.css so the tokens resolve even when the
// consuming app pulls in components individually.
import '../../css/kpi-card.css'
/**
 * CnKpiGrid — Responsive grid layout for KPI/stats cards.
 *
 * Wraps CnStatsBlock components in a responsive CSS grid. Supports
 * 2, 3, or 4 column layouts that adapt to screen size.
 *
 * 4-column dashboard (default)
 *
 * ```vue
 * <CnKpiGrid>
 *   <CnStatsBlock title="Cases" :count="42" :icon="BriefcaseOutline" variant="primary" />
 *   <CnStatsBlock title="Contacts" :count="128" :icon="AccountGroup" variant="success" />
 *   <CnStatsBlock title="Tasks" :count="7" :icon="ClipboardCheck" variant="warning" />
 *   <CnStatsBlock title="Overdue" :count="3" :icon="AlertCircle" variant="error" />
 * </CnKpiGrid>
 * ```
 *
 *
 * 2-column layout
 * ```vue
 * <CnKpiGrid :columns="2">
 *   <CnStatsBlock title="Open" :count="15" />
 *   <CnStatsBlock title="Closed" :count="42" />
 * </CnKpiGrid>
 * ```
 *
 */
export default {
	name: 'CnKpiGrid',

	props: {
		/** Number of columns at max width: 2, 3, or 4 */
		columns: {
			type: Number,
			default: 4,
			validator: (v) => [2, 3, 4].includes(v),
		},

		/** Additional CSS class(es) applied to the KPI grid element */
		gridClass: {
			type: String,
			default: '',
		},
	},

	computed: {
		gridClasses() {
			return {
				[`cn-kpi-grid--cols-${this.columns} ${this.gridClass}`]: true,
			}
		},
	},
}
</script>

<style scoped>
/*
 * Layout only — this component draws no KPI of its own; the tiles inside it do
 * (src/css/kpi-card.css). What it DOES owe the canonical look is the rhythm
 * around those tiles, so the gutter is the card's own `--cn-kpi-grid-gap`
 * rather than a number picked here. A grid whose gutter disagrees with the
 * card's padding reads as a different design even when every tile is
 * identical.
 */

.cn-kpi-grid {
	display: grid;
	gap: var(--cn-kpi-grid-gap, 16px);
	margin-bottom: 24px;
}

/*
 * `minmax(0, 1fr)`, not `1fr`. A grid track's default minimum is `auto`, which
 * refuses to shrink below its content — and the canonical KPI value is
 * deliberately `white-space: nowrap`, so a long number (a formatted currency
 * amount, a six-figure count) pushes its track wider than its share and the
 * whole row overflows the page. With a 0 minimum the track holds its share and
 * the card's own `overflow: hidden` clips instead.
 */
.cn-kpi-grid--cols-2 {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cn-kpi-grid--cols-3 {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cn-kpi-grid--cols-4 {
	grid-template-columns: repeat(4, minmax(0, 1fr));
}

/* Responsive breakpoints */
@media (max-width: 1200px) {
	.cn-kpi-grid--cols-4 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 900px) {
	.cn-kpi-grid--cols-3 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 600px) {
	.cn-kpi-grid--cols-2,
	.cn-kpi-grid--cols-3,
	.cn-kpi-grid--cols-4 {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
