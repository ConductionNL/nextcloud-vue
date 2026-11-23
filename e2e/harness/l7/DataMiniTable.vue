<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A data card whose value is a list of objects (?l7=data-mini-table), as
  pipelinq's ticket page shows the messages with their `createdAt`, in a
  narrow value column. The host rule `[data-testid="data-mini-table"]
  { white-space: nowrap }` stands for a surface that sets nowrap on an
  ancestor.
-->
<template>
	<div class="cn-look-board" data-testid="data-mini-table" style="width: 420px">
		<CnObjectDataWidget
			title="Ticket"
			:schema="schema"
			:objectData="record"
			:columns="2" />
	</div>
</template>

<script>
import CnObjectDataWidget from '../../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'DataMiniTable',

	components: { CnObjectDataWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: {
				title: 'Ticket',
				properties: {
					subject: { type: 'string', title: 'Onderwerp' },
					messages: { type: 'array', title: 'Berichten', items: { type: 'object' } },
				},
			},

			record: {
				id: 't-1',
				subject: 'Afvalpas',
				messages: [
					{ message: 'Dank voor uw aanvraag. Kunt u het nummer van uw afvalpas en uw adres doorgeven, dan zoeken wij het voor u uit.', createdAt: '2026-10-05T07:37:08.269Z' },
					{ message: 'Mijn pas is 12345, Kerkstraat 12.', createdAt: '2026-10-05T09:12:44.001Z' },
				],
			},
		}
	},
}
</script>

<style>
[data-testid="data-mini-table"] {
	white-space: nowrap;
}
</style>
