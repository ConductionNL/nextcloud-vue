<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A cases index in the board view whose columns come from a referenced field
  (?l8=board-reference, screens-board-reference-columns, board DqWerkbord):
  status references statusType rows of two case types, merged by name, a
  "Zaaktype:" select, a "Kolommen:" switch (status | type | behandelaar) and
  a move-targets handler. The page fetches its own cases; the schema, the
  case, statusType and caseType lists and the PATCH are stubbed by the spec
  with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-reference">
		<CnIndexPage
			title="Alle zaken"
			register="dossiq"
			schema="case"
			viewMode="board"
			:viewModes="['table', 'board']"
			:selectable="true"
			:showRefresh="false"
			:board="board" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardReference',

	components: { CnIndexPage },

	provide() {
		return {
			cnLook: 'board',
			cnRegistry: {
				// Woo cases may not skip to Besluit; everything else is open.
				caseStatusTargets: async ({ card }) => (card.caseType === 'woo' ? ['s1', 's2'] : null),
			},
		}
	},

	data() {
		return {
			board: {
				statusField: 'status',
				wrap: true,
				columnSwitchLabel: 'Kolommen',
				hint: 'Een kolom per waarde van de eigenschap.',
				moveTargetsHandler: 'caseStatusTargets',
				card: { title: 'title', sub: ['identifier'], owner: 'assignee' },
				narrow: { field: 'caseType', label: 'Zaaktype', allLabel: 'Alle zaaktypen', source: { schema: 'caseType', labelField: 'title' } },
				columnFields: [
					{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', narrowBy: { field: 'caseType', rowField: 'caseType' } } },
					{ field: 'caseType', label: 'type', source: { schema: 'caseType', labelField: 'title' }, readOnly: true },
					{ field: 'assignee', label: 'behandelaar', kind: 'values', emptyLabel: 'Niemand' },
				],
			},
		}
	},
}
</script>
