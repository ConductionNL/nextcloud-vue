<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A queue with two filter strips (?l7=filter-strip), as board PqWachtrij
  draws it: the kind in the quick filters, the channel in a second strip
  with counts. The page fetches its own rows, as a manifest page does; the
  spec stubs OpenRegister (schema, list and aggregations).
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="filter-strip">
		<CnIndexPage
			title="Wachtrij"
			register="pipelinq"
			schema="ticket"
			:columns="[{ key: 'title', label: 'Onderwerp' }]"
			:showRefresh="false"
			:quickFilters="quickFilters"
			:filterStrip="filterStrip" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'FilterStrip',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			quickFilters: [{ label: 'Alles' }, { label: 'Klachten', filter: { kind: 'complaint' } }],
			filterStrip: {
				field: 'channel',
				allLabel: 'Alle',
				showCount: true,
				options: [{ value: 'web', label: 'Mijn Zuiddrecht' }, { value: 'email', label: 'E-mail' }, { value: 'desk', label: 'Balie' }],
			},
		}
	},
}
</script>
