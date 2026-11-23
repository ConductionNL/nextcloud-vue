<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An editable dashboard grid the way launchpad mounts it
  (?l7=grid-drag-saves): responsive column options, a string item key, and
  the layout written back from every `layout-change`. Each emitted layout is
  kept on `window.__gridLayouts`; `?resize=1` widens and heightens the first
  item from the layout a second after mount, and `?late=1` mounts it in
  view mode and turns editing on half a second later.
-->
<template>
	<div style="width: 1500px" data-testid="grid-drag-saves">
		<CnDashboardGrid
			:layout="layout"
			:editable="editable"
			:columns="12"
			:cellHeight="60"
			:margin="8"
			:columnOpts="columnOpts"
			:itemKey="(item) => String(item.id)"
			@layoutChange="onLayoutChange">
			<template #widget="{ item }">
				<div :data-testid="`drag-card-${item.id}`" style="background: #eef; height: 100%">
					{{ item.id }}
				</div>
			</template>
		</CnDashboardGrid>
	</div>
</template>

<script>
import CnDashboardGrid from '../../../src/components/CnDashboardGrid/CnDashboardGrid.vue'
import { getDashboardColumnOpts } from '../../../src/utils/dashboardPlacement.js'

import 'gridstack/dist/gridstack.min.css'
import '../../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'GridDragSaves',

	components: { CnDashboardGrid },

	data() {
		return {
			columnOpts: getDashboardColumnOpts(),
			editable: params.get('late') !== '1',
			layout: [
				{ id: 1, gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 },
				{ id: 2, gridX: 4, gridY: 3, gridWidth: 4, gridHeight: 2 },
			],
		}
	},

	mounted() {
		window.__gridLayouts = []
		if (!this.editable) {
			setTimeout(() => {
				this.editable = true
			}, 500)
		}
		if (params.get('resize') === '1') {
			setTimeout(() => {
				this.layout = this.layout.map((item) => (item.id === 1 ? { ...item, gridWidth: 6, gridHeight: 3 } : item))
			}, 1000)
		}
	},

	methods: {
		onLayoutChange(layout) {
			window.__gridLayouts.push(layout.map(({ id, gridX, gridY, gridWidth, gridHeight }) => ({ id, gridX, gridY, gridWidth, gridHeight })))
			this.layout = layout
		},
	},
}
</script>
