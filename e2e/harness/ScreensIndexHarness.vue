<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts of screens-index-list-parity, screens-card-parity and
  screens-chrome-parity that only a real browser can measure
  (?screensindex=table|cards). The real CnIndexPage renders in the board look
  (`cnLook: board`); `&plain=1` mounts the same page without it. `&w=<px>` sets
  the width of the box the page sits in. `&wide=1` swaps in a ticket list
  with seven columns and long values (PqTickets), the table that ran past
  its card (screens-index-table-fit-parity).
-->
<template>
	<div :class="plain ? '' : 'cn-look-board'" :style="{ width: width + 'px' }" data-testid="screensindex-box">
		<CnIndexPage
			title="Cases"
			:schema="wide ? wideSchema : schema"
			:objects="wide ? wideRows : rows"
			:loading="false"
			:showRefresh="false"
			:viewMode="scenario"
			:showTitle="true"
			:pagination="{ total: 42, page: 1, pages: 3, limit: 14 }"
			:headerButtons="[{ action: 'add', label: 'New case', variant: 'primary' }, { action: 'export', label: 'Download', variant: 'secondary' }]"
			:quickFilters="queue ? queueFilters : null"
			:sidePanel="queue ? queuePanel : []"
			:filterMenu="queue"
			:viewModes="queue ? ['table', 'cards'] : null"
			:quickFilterPlacement="placement" />
	</div>
</template>

<script>
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'ScreensIndexHarness',

	components: { CnIndexPage },

	provide() {
		return { cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board' }
	},

	data() {
		const rows = []
		for (let i = 1; i <= 5; i++) {
			rows.push({ id: String(i), title: `Case ${i}`, status: i % 2 ? 'open' : 'closed', owner: 'Anouk Bakker' })
		}
		const wideRows = []
		const clients = ['M. de Graaf', 'Stichting Wijkcentrum De Lindenhof en omgeving', 'Bakkerij De Basislijn BV', 'J. van der Heijden-Oosterhuis']
		for (let i = 1; i <= 6; i++) {
			wideRows.push({
				id: 'w' + i,
				subject: i === 1 ? 'Afvalpas werkt niet bij de ondergrondse container aan de Lindelaan sinds vorige week' : `Vraag over vergunning straatfeest ${i}`,
				client: clients[i % clients.length],
				type: i % 2 ? 'Verzoek' : 'Klacht',
				status: i % 2 ? 'In behandeling' : 'Nieuw',
				channel: 'Mijn Zuiddrecht',
				waiting: `${i * 27} dagen`,
				assignee: i % 3 ? 'Pieter Jansen' : 'Fatma Yildiz-van Leeuwen',
			})
		}
		return {
			wide: params.get('wide') === '1',
			wideRows,
			wideSchema: {
				title: 'Ticket',
				properties: {
					subject: { type: 'string', title: 'Onderwerp' },
					client: { type: 'string', title: 'Klant' },
					type: { type: 'string', title: 'Type' },
					status: { type: 'string', title: 'Status' },
					channel: { type: 'string', title: 'Kanaal' },
					waiting: { type: 'string', title: 'Wachtend' },
					assignee: { type: 'string', title: 'Behandelaar' },
				},
			},

			// DqTeamwachtrij (?wq=1): five chips with counts, a side panel, the
			// Filter menu and the view switch; `qfp` sets quickFilterPlacement.
			queue: params.get('wq') === '1',
			placement: params.get('qfp') || '',
			queueFilters: [
				{ label: 'Alle', filter: {}, default: true },
				{ label: 'Woo-verzoek', filter: { status: 'open' } },
				{ label: 'Bezwaar', filter: { status: 'closed' } },
				{ label: 'Klacht', filter: { status: 'open' } },
				{ label: 'Subsidie', filter: { status: 'closed' } },
			],

			queuePanel: [{ id: 'note', type: 'text', title: 'Team vandaag', content: { text: 'Vijf mensen ingeroosterd.' } }],
			scenario: params.get('screensindex') || 'table',
			plain: params.get('plain') === '1',
			width: Number(params.get('w') || 1200),
			rows,
			schema: {
				title: 'Case',
				properties: {
					title: { type: 'string', title: 'Title' },
					status: { type: 'string', title: 'Status', enum: ['open', 'closed'] },
					owner: { type: 'string', title: 'Owner' },
				},
			},
		}
	},
}
</script>
