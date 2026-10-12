<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A board dashboard page, as pipelinq's "Mijn werk" configures it: a bar of
  chips, a switch and a select, a KPI row of three tiles and two record lists
  (?l4=phone-board). The spec sets the viewport to a phone (390px wide) and stubs
  the list and count reads with page.route().
-->
<template>
	<div class="phone-dash-harness" data-testid="phone-dash-harness">
		<CnDashboardPage
			title="Mijn werk"
			:showHeader="false"
			:kpiRow="['k1', 'k2', 'k3']"
			:widgets="widgets"
			:layout="layout"
			:allowEdit="false" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

export default {
	name: 'PhoneBoard',

	components: { CnDashboardPage },

	setup() {
		provide('cnLook', 'board')
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		const base = { register: 'pipelinq', schema: 'ticket' }
		const tile = (id, label) => ({ id, type: 'stat', title: label, content: { label, source: { ...base, metric: 'count' }, route: 'Tickets' } })
		const list = (id, title) => ({
			id,
			type: 'record-list',
			title,
			content: { ...base, title: '{title}', meta: '{client.name} · {channel}', avatar: '{client.name}', extend: ['client'], rowRoute: 'TicketDetail', limit: 3 },
		})
		return {
			widgets: [
				{
					id: 'bar',
					type: 'workspace-filter',
					title: 'Toon',
					showTitle: false,
					content: {
						layout: 'bar',
						controls: [
							{ style: 'chips', label: 'Toon', writes: '@workspace.lens', default: 'all', options: [{ value: 'all', label: 'Alle', count: 9 }, { value: 'tickets', label: 'Tickets', count: 7 }, { value: 'leads', label: 'Leads', count: 1 }, { value: 'tasks', label: 'Opvolgingen', count: 1 }] },
							{ style: 'toggle', label: 'Toon afgerond', writes: '@workspace.showDone', align: 'end' },
							{ style: 'select', label: 'Sortering', writes: '@workspace.sort', default: 'deadline', options: [{ value: 'deadline', label: 'Termijn eerst' }] },
						],
					},
				},
				tile('k1', 'Open op mij'),
				tile('k2', 'Beantwoord deze week'),
				tile('k3', 'Omgezet naar een zaak'),
				list('l1', 'Vandaag beantwoorden'),
				list('l2', 'Wacht op mij'),
			],

			layout: [
				{ id: '1', widgetId: 'bar', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true },
				{ id: '2', widgetId: 'l1', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 5 },
				{ id: '3', widgetId: 'l2', gridX: 6, gridY: 2, gridWidth: 6, gridHeight: 5 },
			],
		}
	},
}
</script>
