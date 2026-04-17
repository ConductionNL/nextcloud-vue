<template>
	<div class="cn-kpi-grid" :class="gridClasses">
		<slot />
	</div>
</template>

<script>
/**
 * CnKpiGrid — Responsive grid layout for KPI/stats cards.
 *
 * Wraps CnStatsBlock components in a responsive CSS grid. Supports
 * 2, 3, or 4 column layouts that adapt to screen size.
 *
 * @example 4-column dashboard (default)
 * <CnKpiGrid>
 *   <CnStatsBlock title="Cases" :count="42" :icon="BriefcaseOutline" variant="primary" />
 *   <CnStatsBlock title="Contacts" :count="128" :icon="AccountGroup" variant="success" />
 *   <CnStatsBlock title="Tasks" :count="7" :icon="ClipboardCheck" variant="warning" />
 *   <CnStatsBlock title="Overdue" :count="3" :icon="AlertCircle" variant="error" />
 * </CnKpiGrid>
 *
 * @example 2-column layout
 * <CnKpiGrid :columns="2">
 *   <CnStatsBlock title="Open" :count="15" />
 *   <CnStatsBlock title="Closed" :count="42" />
 * </CnKpiGrid>
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
.cn-kpi-grid {
	display: grid;
	gap: 16px;
	margin-bottom: 24px;
}

.cn-kpi-grid--cols-2 {
	grid-template-columns: repeat(2, 1fr);
}

.cn-kpi-grid--cols-3 {
	grid-template-columns: repeat(3, 1fr);
}

.cn-kpi-grid--cols-4 {
	grid-template-columns: repeat(4, 1fr);
}

/* Responsive breakpoints */
@media (max-width: 1200px) {
	.cn-kpi-grid--cols-4 {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 900px) {
	.cn-kpi-grid--cols-3 {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 600px) {
	.cn-kpi-grid--cols-2,
	.cn-kpi-grid--cols-3,
	.cn-kpi-grid--cols-4 {
		grid-template-columns: 1fr;
	}
}
</style>
