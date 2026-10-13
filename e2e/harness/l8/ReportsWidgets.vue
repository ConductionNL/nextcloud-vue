<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A reports page with a highlighted report under its cards (?l8=reports-widgets),
  as board DcRapportages draws "Vergaderingen en efficiëntie". The aggregation
  read is stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="reports-widgets">
		<CnReportsPage
			title="Rapportages"
			:cards="cards"
			:widgets="widgets"
			:layout="layout" />
	</div>
</template>

<script>
import CnReportsPage from '../../../src/components/CnReportsPage/CnReportsPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ReportsWidgets',

	components: { CnReportsPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			cards: [
				{ id: 'Decisions', label: 'Besluiten', description: 'Wat er besloten is.', route: 'DecisionsReport' },
				{ id: 'Meetings', label: 'Vergaderingen en aanwezigheid', description: 'Waar vergaderingen staan.', route: 'MeetingsReport' },
			],

			widgets: [{
				id: 'efficiency',
				type: 'stat',
				title: 'Vergaderingen en efficiëntie',
				headerLink: { label: 'Hele rapportage', href: '#efficiency' },
				content: {
					label: 'Vergaderingen dit jaar',
					note: '20 raad, 38 commissie',
					source: { register: 'decidiq', schema: 'meeting', metric: 'count' },
				},
			}],

			layout: [{ id: '1', widgetId: 'efficiency', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }],
		}
	},
}
</script>
