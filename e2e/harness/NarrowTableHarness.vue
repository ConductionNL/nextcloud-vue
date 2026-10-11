<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A "Recently opened" tile at the width it gets on the dossiq dashboard
  (?narrowtable=1): identifier, a long title and a trailing date in 342px, and
  an empty tile whose text is a sentence. `&plain=1` mounts the same tile with
  `fitWidth: false`, the table's own auto layout, as the control. `&board=1`
  renders the tiles in the board look with the case number as the title's
  secondary line, as dossiq's dashboard does (dashboard-tile-text-fits).
-->
<template>
	<div class="narrow-table" :class="{ 'cn-look-board': board }">
		<div class="narrow-table__tile" data-testid="narrow-table-rows">
			<CnWidgetObjectTable
				:rows="rows"
				:columns="columns"
				:fitWidth="!plain"
				hideHeader
				borderless />
		</div>
		<div class="narrow-table__tile" data-testid="narrow-table-empty">
			<CnWidgetObjectTable
				:rows="[]"
				:columns="columns"
				:fitWidth="!plain"
				emptyText="This server does not keep track of which cases you open, so there is nothing to show here yet."
				hideHeader
				borderless />
		</div>
	</div>
</template>

<script>
import CnWidgetObjectTable from '../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'

import '../../src/css/look-board-index.css'

const board = typeof window !== 'undefined' && /[?&]board=1/.test(window.location.search)

export default {
	name: 'NarrowTableHarness',
	components: { CnWidgetObjectTable },

	provide() {
		return { cnLook: board ? 'board' : 'nextcloud' }
	},

	data() {
		return {
			plain: typeof window !== 'undefined' && /[?&]plain=1/.test(window.location.search),
			board,
			columns: board
				? [
						{ key: 'title', cellClass: 'cn-cell--strong', secondary: 'identifier' },
						{ key: 'viewedAt', cellClass: 'cn-cell--muted cn-cell--end' },
					]
				: [
						{ key: 'identifier', cellClass: 'cn-cell--muted' },
						{ key: 'title', cellClass: 'cn-cell--strong' },
						{ key: 'viewedAt', cellClass: 'cn-cell--muted cn-cell--end' },
					],

			rows: [
				{ id: '1', identifier: 'ZAAK-2026-000123', title: 'Omgevingsvergunning voor het verbouwen van een monumentaal pand aan de Herengracht', viewedAt: '3 days ago' },
				{ id: '2', identifier: 'ZAAK-2026-000124', title: 'Sloopmelding', viewedAt: 'today' },
			],
		}
	},
}
</script>

<style scoped>
.narrow-table {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px;
}

.narrow-table__tile {
	width: 342px;
	overflow: hidden;
	border: 1px solid var(--color-border, #ccc);
}
</style>
