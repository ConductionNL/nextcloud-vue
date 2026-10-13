<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A queue with two filter strips (?l7=filter-strip), as board PqWachtrij
  draws it: the kind in the quick filters, the channel in a second strip
  with counts. The harness holds the rows and applies the filter the page
  reports; the spec stubs OpenRegister's aggregation endpoint for the counts.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="filter-strip">
		<CnIndexPage
			title="Wachtrij"
			register="pipelinq"
			:schema="schema"
			:columns="[{ key: 'title', label: 'Onderwerp' }]"
			:objects="shown"
			:loading="false"
			:showRefresh="false"
			:activeFilters="active"
			:quickFilters="quickFilters"
			:filterStrip="filterStrip"
			:pagination="{ total: shown.length, page: 1, pages: 1, limit: 20 }"
			@filter-change="onFilter" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

const ROWS = [
	{ id: '1', title: 'Afvalpas', channel: 'web' },
	{ id: '2', title: 'Straatfeest', channel: 'email' },
	{ id: '3', title: 'Paspoort', channel: 'desk' },
	{ id: '4', title: 'Parkeren', channel: 'web' },
]

export default {
	name: 'FilterStrip',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			active: {},
			schema: { title: 'Ticket', titlePlural: 'Tickets', slug: 'ticket', properties: { title: { type: 'string', title: 'Onderwerp' }, channel: { type: 'string', title: 'Kanaal' } } },
			quickFilters: [{ label: 'Alles' }, { label: 'Klachten', filter: { kind: 'complaint' } }],
			filterStrip: {
				field: 'channel',
				allLabel: 'Alle',
				showCount: true,
				options: [{ value: 'web', label: 'Mijn Zuiddrecht' }, { value: 'email', label: 'E-mail' }, { value: 'desk', label: 'Balie' }],
			},
		}
	},

	computed: {
		shown() {
			const picked = this.active.channel || []
			return picked.length === 0 ? ROWS : ROWS.filter((row) => picked.includes(row.channel))
		},
	},

	methods: {
		onFilter({ key, values }) {
			this.active = { ...this.active, [key]: values }
		},
	},
}
</script>
