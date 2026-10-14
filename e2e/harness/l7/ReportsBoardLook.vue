<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The reports page under the board look (?l7=reports-board-look), with the
  sections and cards of board DcRapportages.
-->
<template>
	<div class="cn-look-board" style="width: 1176px; background: var(--color-background-hover)" data-testid="reports-board-look">
		<CnReportsPage :page="page" />
	</div>
</template>

<script>
import CnReportsPage from '../../../src/components/CnReportsPage/CnReportsPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ReportsBoardLook',

	components: { CnReportsPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			page: {
				id: 'Reports',
				title: 'Rapportages',
				config: {
					description: 'Kies een rapportage om die te openen. Alle cijfers komen uit de registers van decidiq.',
					categories: { decisions: 'Besluiten en stemmingen', meetings: 'Vergaderingen en mensen' },
					cards: [
						{ id: 'decisions', label: 'Besluiten', description: 'Wat er besloten is, hoe het voorlag en wat openbaar werd.', category: 'decisions', icon: 'Gavel', route: 'Decisions' },
						{ id: 'votes', label: 'Stemmingen', description: 'Hoe stemrondes eindigden en hoe de stemmen vielen, per fractie en per lid.', category: 'decisions', icon: 'ChartBar', route: 'Votes' },
						{ id: 'attendance', label: 'Vergaderingen en aanwezigheid', description: 'Waar vergaderingen staan, hoe ze gehouden worden en wie er was.', category: 'meetings', icon: 'ViewDashboardOutline', route: 'Attendance' },
						{ id: 'engagement', label: 'Betrokkenheid', description: 'Wie het woord voerde, hoe lang, en hoe betrokken de zaal was.', category: 'meetings', icon: 'AccountGroupOutline', route: 'Engagement' },
					],
				},
			},
		}
	},
}
</script>
