<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A dashboard whose card is a `record-list` (?ptlistcard=1), as the portal
  dashboard board draws "Open toegangsverzoeken". The real CnDashboardPage
  under the board look. The host rule `#pt-host a` stands for the link style a
  Nextcloud theme sets with an id selector. OpenRegister is stubbed by the spec
  with page.route().
-->
<template>
	<div id="pt-host"
		class="cn-look-board"
		data-testid="pt-host"
		style="width: 760px">
		<CnDashboardPage
			title="Dashboard"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../src/css/index.css'

export default {
	name: 'PtDashboardHarness',

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
					filter: { state: 'pending' },
					title: '{displayName}',
					meta: 'Reden: {reason}',
					trailing: '{waiting}',
					pill: { field: 'state', labels: { pending: 'Beoordelen' }, colorMap: { pending: 'warning' } },
					rowRoute: 'AccessRequest',
				},
			}],

			layout: [{ id: '1', widgetId: 'list-requests', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 5 }],
		}
	},
}
</script>

<style>
/* The host's link rule: an id selector, which no class rule outranks. */
#pt-host a {
	color: #06c;
	text-decoration: underline;
}
</style>
