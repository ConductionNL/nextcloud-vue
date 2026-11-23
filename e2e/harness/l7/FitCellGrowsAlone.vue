<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  portaliq's portal page (PortalDetail): one full-width size-to-content cell
  that holds the whole tab strip (?l7=fit-cell-grows-alone&below=0|1). Its
  content grows a second after the grid is built, as when the portal's data
  arrives. With below=1 a card sits under it.
-->
<template>
	<div style="width: 1100px" data-testid="fit-cell-grows-alone">
		<CnDashboardGrid :layout="layout">
			<template #widget="{ item }">
				<div :data-testid="`alone-card-${item.id}`" style="background: #eef; border-radius: 8px">
					<div :style="{ height: heightOf(item) }">
						{{ item.id }}
					</div>
				</div>
			</template>
		</CnDashboardGrid>
	</div>
</template>

<script>
import CnDashboardGrid from '../../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

import '../../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'FitCellGrowsAlone',

	components: { CnDashboardGrid },

	data() {
		const layout = [{ id: 'tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 8, sizeToContent: true }]
		if (params.get('below') === '1') {
			layout.push({ id: 'below', gridX: 0, gridY: 8, gridWidth: 12, gridHeight: 2 })
		}
		return { grown: false, layout }
	},

	mounted() {
		setTimeout(() => {
			this.grown = true
		}, 1000)
	},

	methods: {
		heightOf(item) {
			if (item.id === 'tabs') {
				return this.grown ? '900px' : '100px'
			}
			return '100%'
		},
	},
}
</script>
