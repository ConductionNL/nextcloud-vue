<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A packing dashboard grid with a size-to-content card over another card
  (?l7=fit-cell-close-up), as pipelinq Mijn werk: the card holds about
  110px of content on a three-row (240px) cell. The same layout on a grid
  that does not pack is drawn beside it as the control.
-->
<template>
	<div style="display: flex; gap: 20px; width: 1400px" data-testid="fit-cell-close-up">
		<div v-for="grid in grids"
			:key="grid.key"
			style="width: 680px"
			:data-testid="`fit-grid-${grid.key}`">
			<CnDashboardGrid :layout="layout" :float="grid.float">
				<template #widget="{ item }">
					<div :data-testid="`fit-card-${item.id}`" style="background: #eef; border-radius: 8px">
						<div :style="{ height: item.id === 'fit' ? '110px' : '100%', minHeight: '40px' }">
							{{ item.id }}
						</div>
					</div>
				</template>
			</CnDashboardGrid>
		</div>
	</div>
</template>

<script>
import CnDashboardGrid from '../../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

import '../../../src/css/index.css'

export default {
	name: 'FitCellCloseUp',

	components: { CnDashboardGrid },

	data() {
		return {
			grids: [{ key: 'packing', float: false }, { key: 'control', float: true }],
			layout: [
				{ id: 'fit', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, sizeToContent: true },
				{ id: 'side', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 },
				{ id: 'below', gridX: 0, gridY: 3, gridWidth: 6, gridHeight: 2 },
			],
		}
	},
}
</script>
