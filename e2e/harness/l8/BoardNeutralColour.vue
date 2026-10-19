<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A cases board whose statusType rows carry a colour (?l8=board-neutral-colour,
  board-neutral-column-colour): the columns come from status, merged by name across
  two case types, and `source.neutralColor` says grey is the colour nobody chose. The
  spec stubs the schema and the lists with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-neutral-colour">
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
	name: 'BoardNeutralColour',

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
					{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', colorField: 'colour', neutralColor: 'grey', narrowBy: { field: 'caseType', rowField: 'caseType' } } },
				],
			},
		}
	},
}
</script>
