<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Stacked board stat tiles in a dashboard card-fit cell (?l7=stat-tile-fit):
  the cell's content box is 162 x 118px with 8px 14px padding and clips, as
  dossiq's Mijn werk tiles at 1100 wide. "Afgehandeld deze maand" wraps to two
  lines there; "Mijn open zaken" keeps one.
-->
<template>
	<div class="cn-look-board" style="display: flex; gap: 16px" data-testid="stat-tile-fit">
		<div v-for="tile in tiles"
			:key="tile.label"
			class="stat-tile-fit__cell"
			data-testid="stat-tile-fit-cell">
			<CnStatWidget :content="tile" />
		</div>
	</div>
</template>

<script>
import CnStatWidget from '../../../src/components/CnStatWidget/CnStatWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'StatTileFit',

	components: { CnStatWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			tiles: [
				{ label: 'Afgehandeld deze maand', value: 0, caption: 'september: 0', layout: 'stacked' },
				{ label: 'Mijn open zaken', value: 0, layout: 'stacked' },
			],
		}
	},
}
</script>

<style scoped>
/* The card-fit content area of CnDashboardPage, at dossiq's 1100 size. */
.stat-tile-fit__cell {
	display: flex;
	flex-direction: column;
	justify-content: safe center;
	width: 162px;
	height: 118px;
	padding: 8px 14px;
	overflow: hidden;
	border: 1px solid var(--color-border);
}
</style>
