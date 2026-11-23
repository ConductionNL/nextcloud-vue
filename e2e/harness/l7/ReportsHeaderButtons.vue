<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The reports page with board DcRapportages' header (?l7=reports-header-buttons):
  "Downloaden" beside the title, then the buildiq square.
-->
<template>
	<div class="cn-look-board" style="width: 1176px; background: var(--color-background-hover)" data-testid="reports-header-buttons">
		<CnReportsPage :page="page" @headerAction="last = $event.id" />
		<p data-testid="reports-header-last">
			{{ last }}
		</p>
	</div>
</template>

<script>
import CnReportsPage from '../../../src/components/CnReportsPage/CnReportsPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ReportsHeaderButtons',

	components: { CnReportsPage },

	provide() {
		return { cnLook: 'board', cnOpenBuildAvailable: true }
	},

	data() {
		return {
			last: '',
			page: {
				id: 'Reports',
				title: 'Rapportages',
				config: {
					description: 'Kies een rapportage om die te openen. Alle cijfers komen uit de registers van decidiq.',
					headerActions: [{ id: 'download', label: 'Downloaden', handler: 'emit' }],
					headerButtons: [{ label: 'Downloaden', action: 'download', icon: 'Download' }],
					cards: [
						{ id: 'decisions', label: 'Besluiten', description: 'Wat er besloten is.', icon: 'Gavel', route: 'Decisions' },
					],
				},
			},
		}
	},
}
</script>
