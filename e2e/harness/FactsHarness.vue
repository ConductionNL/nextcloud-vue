<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The `facts` widget as a detail page side card (?factswidget=1).

  Resolved through CnDetailWidgetHost by its registry type, the path a
  manifest placement takes, so a broken registration fails here. The object is
  PtPortal's portal; no request is made (no `source`).

  `?factswidget=pill` adds a task whose status is a reference: a pill that
  shows the status's name and takes its tone from the status's `state`
  (the spec stubs the OpenRegister list request).
-->
<template>
	<div class="facts-harness cn-look-board">
		<div class="facts-harness__side" data-testid="facts-harness-widget">
			<CnDetailWidgetHost
				:widget="widget"
				chrome="card"
				objectId="portal-1"
				:object="record"
				register="portaliq"
				schema="portal" />
		</div>
		<div v-if="showPill" class="facts-harness__side" data-testid="facts-harness-pill">
			<CnDetailWidgetHost
				:widget="pillWidget"
				chrome="card"
				objectId="task-1"
				:object="task"
				register="dossiq"
				schema="task" />
		</div>
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

export default {
	name: 'FactsHarness',

	components: { CnDetailWidgetHost },

	data() {
		return {
			record: {
				id: 'portal-1',
				title: 'Gemeente Zuiddrecht',
				domains: [{ hostname: 'zuiddrecht.nl' }],
				certificateUntil: '2027-01-14',
				locales: ['Nederlands'],
				status: 'published',
			},

			showPill: typeof window !== 'undefined' && /[?&]factswidget=pill/.test(window.location.search),

			task: { id: 'task-1', title: 'Plan beoordelen', status: 'st-9' },

			pillWidget: {
				id: 'task-status',
				type: 'facts',
				title: 'Status',
				content: {
					fields: [
						{ as: 'pill', path: 'status', resolve: { register: 'dossiq', schema: 'status', labelField: 'name', toneField: 'state' }, map: { 'In review': 'In behandeling' }, colorMap: { open: 'warning', closed: 'success' } },
					],
				},
			},

			widget: {
				id: 'portal-side-domain',
				type: 'facts',
				title: 'Domein en certificaat',
				content: {
					fields: [
						{ path: 'domains', label: 'Domein', format: 'list', itemPath: 'hostname' },
						{ path: 'certificateUntil', label: 'Certificaat', format: 'date-long' },
						{ path: 'locales', label: 'Taal' },
						{ as: 'pill', path: 'status', map: { published: 'Gepubliceerd' }, variantMap: { published: 'success' } },
					],
				},
			},
		}
	},
}
</script>

<style scoped>
.facts-harness__side {
	width: 300px;
	padding: 16px;
}
</style>
