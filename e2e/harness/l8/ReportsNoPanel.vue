<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The reports page under the board look with a highlighted report under its
  cards (?l8=reports-no-panel), inside a stand-in for the nldesign theme's
  element overrides: a catch-all that paints anything named like a widget
  white, and underlined links. Board DcRapportages draws neither.
  OpenRegister is stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board l8-theme-stand-in" style="width: 1176px; background: var(--color-background-hover)" data-testid="reports-no-panel">
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
	name: 'ReportsNoPanel',

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
				type: 'stats-block',
				title: 'Vergaderingen en efficiëntie',
				showTitle: true,
				content: {
					layout: 'grid',
					columns: 4,
					stats: [
						{ label: 'Vergaderingen dit jaar', source: { register: 'decidiq', schema: 'meeting', metric: 'count' } },
						{ label: 'Kosten per vergadering', source: { register: 'decidiq', schema: 'meeting', metric: 'count' } },
					],
				},
			}],

			layout: [{ id: '1', widgetId: 'efficiency', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
		}
	},
}
</script>

<style>
/* The theme's rules, as nldesign's element-overrides.css writes them. */
.l8-theme-stand-in [class*="widget"]:not([class*="widget__"]):not(#header *) {
	background: var(--color-main-background);
}

.l8-theme-stand-in a:not(#header *) {
	text-decoration: underline;
}
</style>
