<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts of screens-dashboard-parity and screens-kanban-parity that only a
  real browser can measure (?screens=segmented|kpi|tile|header|board). The real
  components render here, in the board look (`cnLook: board`); `&plain=1` mounts
  the same surface without it. `&w=<px>` sets the width of the content box.
-->
<template>
	<div class="screens-parity" :style="{ width: width + 'px' }" data-testid="screens-box">
		<template v-if="scenario === 'segmented'">
			<CnSegmentedControl
				size="compact"
				mode="toggle"
				ariaLabel="Period"
				modelValue="quarter"
				:options="[
					{ value: 'last-7', label: 'Last 7 days' },
					{ value: 'last-30', label: 'Last 30 days' },
					{ value: 'quarter', label: 'Quarter' },
					{ value: 'year', label: 'Year' },
				]" />
			<CnSegmentedControl
				class="screens-parity__normal"
				ariaLabel="Normal"
				modelValue="a"
				:options="[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }]" />
		</template>

		<CnKpiGrid v-else-if="scenario === 'kpi'" columns="auto" data-testid="screens-kpi">
			<div v-for="n in 4"
				:key="n"
				class="screens-parity__tile"
				data-testid="screens-kpi-tile">
				Tile {{ n }}
			</div>
		</CnKpiGrid>

		<template v-else-if="scenario === 'tile'">
			<CnStatsBlock
				title="Open cases"
				:count="14"
				countLabel="3 new this week"
				layout="stacked"
				data-testid="screens-tile" />
			<CnStatsBlock
				title="Linked"
				:count="7"
				layout="stacked"
				:clickable="true"
				:icon="TileIcon"
				data-testid="screens-tile-linked" />
		</template>

		<CnDashboardPage
			v-else-if="scenario === 'header'"
			title="Dashboard"
			description="Good morning, Pieter"
			:layout="[]"
			:widgets="[]"
			:allowEdit="true" />

		<CnBoardView
			v-else-if="scenario === 'board'"
			:rows="rows"
			:statusFieldSchema="{ states: states }"
			statusField="status"
			:cardFields="['title']"
			:cardRoles="{ title: 'title', sub: ['id'], owner: 'owner' }"
			:columnLimit="4" />
	</div>
</template>

<script>
import { h, markRaw } from 'vue'
import CnBoardView from '../../src/components/CnBoardView/CnBoardView.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnKpiGrid from '../../src/components/CnKpiGrid/CnKpiGrid.vue'
import CnSegmentedControl from '../../src/components/CnSegmentedControl/CnSegmentedControl.vue'
import CnStatsBlock from '../../src/components/CnStatsBlock/CnStatsBlock.vue'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const STATES = ['Received', 'Review', 'Decision', 'Publish', 'Archive', 'Closed']

export default {
	name: 'ScreensParityHarness',

	components: { CnBoardView, CnDashboardPage, CnKpiGrid, CnSegmentedControl, CnStatsBlock },

	provide() {
		return { cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board' }
	},

	data() {
		const columns = Number(params.get('n') || 4)
		const states = STATES.slice(0, columns).map((key) => ({ key, label: key }))
		const rows = []
		for (const state of states) {
			for (let i = 0; i < 6; i++) {
				rows.push({ id: `${state.key}-${i}`, status: state.key, title: `${state.key} case ${i}`, owner: 'Anouk Bakker' })
			}
		}
		return {
			scenario: params.get('screens') || 'segmented',
			width: Number(params.get('w') || 1184),
			states,
			rows,
			TileIcon: markRaw({ render: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18 }, [h('path', { d: 'M3 3h18v18H3z' })]) }),
		}
	},
}
</script>

<style scoped>
.screens-parity {
	margin: 0;
	background: var(--color-main-background);
}

.screens-parity__normal {
	margin-top: 16px;
}

.screens-parity__tile {
	min-height: 40px;
	border: 1px solid var(--color-border);
}
</style>
