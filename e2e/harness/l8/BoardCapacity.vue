<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A cases board whose statusType rows carry a limit (?l8=board-capacity,
  board-column-capacity): the columns come from status, merged by name across
  two case types, and `source.capacityField` names the limit on each row. The
  spec stubs the schema, the lists and the PATCH with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-capacity">
		<CnIndexPage
			title="Alle zaken"
			register="dossiq"
			schema="case"
			viewMode="kanban"
			:viewModes="['table', 'kanban']"
			:showRefresh="false"
			:kanban="board" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardCapacity',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			board: {
				statusField: 'status',
				wrap: true,
				card: { title: 'title', sub: ['identifier'] },
				narrow: { field: 'caseType', label: 'Zaaktype', allLabel: 'Alle zaaktypen', source: { schema: 'caseType', labelField: 'title' } },
				columnFields: [
					{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', capacityField: 'capacity', narrowBy: { field: 'caseType', rowField: 'caseType' } } },
				],
			},
		}
	},
}
</script>
