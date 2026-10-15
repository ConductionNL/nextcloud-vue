<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  pipelinq's simple dashboard (menu-layout.simple.json) at 1100 wide
  (?l7=fit-cell-order&float=0|1&grow=0|1|late): a size-to-content banner over
  four stat cards, a full-width "client in focus" card, then the lists.
  With grow=1 the banner's text takes three rows instead of two from the
  start; with grow=late it grows a second after the grid is built, as when
  the banner's text arrives with the data.
-->
<template>
	<div style="width: 1100px" data-testid="fit-cell-order">
		<CnDashboardGrid :layout="layout" :float="float">
			<template #widget="{ item }">
				<div :data-testid="`order-card-${item.id}`" style="background: #eef; border-radius: 8px">
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
	name: 'FitCellOrder',

	components: { CnDashboardGrid },

	data() {
		return {
			float: params.get('float') !== '0',
			grow: params.get('grow') === '1',
			layout: [
				{ id: 'greeting', gridX: 0, gridY: 0, gridWidth: 9, gridHeight: 2, sizeToContent: true },
				{ id: 'availability', gridX: 9, gridY: 0, gridWidth: 3, gridHeight: 2, sizeToContent: true },
				{ id: 'first-today', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2, sizeToContent: true },
				{ id: 'new', gridX: 0, gridY: 4, gridWidth: 3, gridHeight: 3, sizeToContent: true },
				{ id: 'waiting-for-me', gridX: 3, gridY: 4, gridWidth: 3, gridHeight: 3, sizeToContent: true },
				{ id: 'callbacks', gridX: 6, gridY: 4, gridWidth: 3, gridHeight: 3, sizeToContent: true },
				{ id: 'waiting-for-customer', gridX: 9, gridY: 4, gridWidth: 3, gridHeight: 3, sizeToContent: true },
				{ id: 'waiting-list', gridX: 0, gridY: 9, gridWidth: 8, gridHeight: 5 },
				{ id: 'per-channel', gridX: 0, gridY: 14, gridWidth: 8, gridHeight: 3, sizeToContent: true },
				{ id: 'callback-list', gridX: 8, gridY: 9, gridWidth: 4, gridHeight: 5 },
				{ id: 'latest-contact', gridX: 8, gridY: 14, gridWidth: 4, gridHeight: 4 },
				{ id: 'client-in-focus', gridX: 0, gridY: 7, gridWidth: 12, gridHeight: 2, sizeToContent: true },
			],
		}
	},

	mounted() {
		if (params.get('grow') === 'late') {
			setTimeout(() => {
				this.grow = true
			}, 1000)
		}
	},

	methods: {
		heightOf(item) {
			if (item.id === 'first-today') {
				return this.grow ? '200px' : '130px'
			}
			if (['waiting-list', 'callback-list', 'latest-contact'].includes(item.id)) {
				return '100%'
			}
			// The other size-to-content cards fill their authored rows.
			return `${item.gridHeight * 80 - 30}px`
		},
	},
}
</script>
