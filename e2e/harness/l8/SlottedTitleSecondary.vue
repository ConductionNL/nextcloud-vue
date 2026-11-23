<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A board-look table whose title column the app draws through its own
  `#column-title` slot, with a secondary line from `col.secondary`
  (?l8=slotted-title-secondary), as pipelinq's report tables do. Beside it the
  same table without the slot.
-->
<template>
	<div class="cn-look-board" style="width: 900px" data-testid="slotted-title-secondary">
		<div data-testid="slotted">
			<CnDataTable :columns="columns" :rows="rows">
				<template #column-title="{ row }">
					<a href="#" class="report-title">{{ row.title }}</a>
				</template>
			</CnDataTable>
		</div>
		<div data-testid="plain">
			<CnDataTable :columns="columns" :rows="rows" />
		</div>
	</div>
</template>

<script>
import CnDataTable from '../../../src/components/CnDataTable/CnDataTable.vue'

import '../../../src/css/index.css'

export default {
	name: 'SlottedTitleSecondary',

	components: { CnDataTable },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [
				{ key: 'title', label: 'Rapport', secondary: 'owner' },
				{ key: 'period', label: 'Periode' },
			],

			rows: [
				{ id: '1', title: 'Leads per bron', owner: 'Pieter de Vries', period: 'Q3 2026' },
				{ id: '2', title: 'Doorlooptijd verzoeken', owner: 'Fatima El-Amrani', period: 'Q3 2026' },
			],
		}
	},
}
</script>
