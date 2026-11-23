<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A cases board whose move-targets handler blocks a target with a reason
  (?l8=board-block-reasons, board-move-block-reasons): a Woo case may go to
  Ontvangen and In behandeling, Besluit is blocked with the guard's sentence,
  and a bezwaar case is open everywhere. The spec stubs the schema, the lists
  and the PATCH with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-block-reasons">
		<CnIndexPage
			title="Alle zaken"
			register="dossiq"
			schema="case"
			viewMode="board"
			:viewModes="['table', 'board']"
			:showRefresh="false"
			:board="board" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardBlockReasons',

	components: { CnIndexPage },

	provide() {
		return {
			cnLook: 'board',
			cnRegistry: {
				caseStatusTargets: async ({ card }) => (card.caseType === 'woo'
					? ['s1', 's2', { key: 's3', allowed: false, reason: 'Er is nog geen besluit vastgelegd.' }]
					: null),
			},
		}
	},

	data() {
		return {
			board: {
				statusField: 'status',
				wrap: true,
				moveTargetsHandler: 'caseStatusTargets',
				card: { title: 'title', sub: ['identifier'] },
				narrow: { field: 'caseType', label: 'Zaaktype', allLabel: 'Alle zaaktypen', source: { schema: 'caseType', labelField: 'title' } },
				columnFields: [
					{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', narrowBy: { field: 'caseType', rowField: 'caseType' } } },
				],
			},
		}
	},
}
</script>
