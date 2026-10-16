<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A cases board whose statusType rows carry a colour (?l8=board-colour-map,
  board-column-colour-map): the columns come from status, merged by name across
  two case types, and `source.colorMap` draws the stored palette names as NL DS tokens. The
  spec stubs the schema and the lists with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-colour-map">
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
	name: 'BoardColourMap',

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
					{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', mergeBy: 'name', colorField: 'colour', neutralColor: 'grey', colorMap: { orange: 'var(--nl-color-orange, #e17000)', grey: 'var(--nl-color-grey, #696969)', 'grey-light': 'var(--nl-color-grey-light, #f0f0f0)' }, narrowBy: { field: 'caseType', rowField: 'caseType' } } },
				],
			},
		}
	},
}
</script>
