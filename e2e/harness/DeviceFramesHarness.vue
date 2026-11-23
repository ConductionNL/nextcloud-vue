<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The device-frames widget as dossiq's field inspection page (board
  DqInspectie) configures it (?deviceframes=1): three phone frames, each
  stacking text widgets of the surface under a title and a status line. The
  real CnDashboardPage hosts it, in the board look, so the container gets the
  surface's widgets the way it does in an app.
-->
<template>
	<div class="device-frames-harness" data-testid="device-frames-harness">
		<CnDashboardPage
			title="Inspectie in het veld"
			:widgets="widgets"
			:layout="layout"
			:allowEdit="false" />
	</div>
</template>

<script>
import { provide } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

export default {
	name: 'DeviceFramesHarness',

	components: { CnDashboardPage },

	setup() {
		provide('cnLook', 'board')
	},

	data() {
		const text = (id, value) => ({ id, type: 'text', title: '', content: { text: value } })
		return {
			widgets: [
				{
					id: 'frames',
					type: 'device-frames',
					title: '',
					content: {
						status: { followConnection: true, offlineText: 'Offline · gesynchroniseerd om 07:42', onlineText: 'Online · gesynchroniseerd om 07:42' },
						frames: [
							{ key: 'today', title: 'Vandaag', widgetIds: ['t1', 't2'] },
							{ key: 'question', title: 'Kerkplein 7', widgetIds: ['t3'] },
							{ key: 'sync', title: 'Synchroniseren', widgetIds: ['t4'] },
						],
					},
				},
				text('t1', 'Molenweg 4 · 09:30 · Bouwtoezicht oplevering · 18 vragen'),
				text('t2', 'Alles voor vandaag staat op dit toestel: zaken, checklists, historie en kaart.'),
				text('t3', 'Vraag 7 van 24 · Zijn de vluchtwegen vrij?'),
				text('t4', '3 wijzigingen wachten op bereik. Ze gaan vanzelf mee zodra u online bent.'),
			],

			layout: [{ id: '1', widgetId: 'frames', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 10, borderless: true, showTitle: false }],
		}
	},
}
</script>
