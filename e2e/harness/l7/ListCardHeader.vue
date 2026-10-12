<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A `record-list` card on a dashboard page (?l7=list-card-header) whose
  header carries a counted link and a note, as it does on a detail page.
  OpenRegister is stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" data-testid="list-card-header" style="width: 760px">
		<CnDashboardPage
			title="Dashboard"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ListCardHeader',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [{
				id: 'list-requests',
				type: 'record-list',
				title: 'Open toegangsverzoeken',
				content: {
					register: 'portaliq',
					schema: 'portalAccessRequest',
					title: '{displayName}',
					headerLink: { label: 'Alle {total} verzoeken', href: '#/verzoeken' },
					headerNote: '{total} in totaal',
				},
			}],

			layout: [{ id: '1', widgetId: 'list-requests', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 5 }],
		}
	},
}
</script>
