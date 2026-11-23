<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A detail page grid with a titled custom widget (?l7=titled-grid-item), as
  dossiq's case type page places "Statuses" and "Portal": the slot content
  fills its cell (height 100%), the page draws the heading above it. Two
  cells of different heights. No request leaves the page (a fake store).
-->
<template>
	<div style="width: 1240px" data-testid="titled-grid-item">
		<CnDetailPage
			title="Woo-verzoek"
			register="reg"
			schema="caseType"
			objectId="ct-1"
			:objectStore="store"
			:subscribe="false"
			:showRelatedObjects="false"
			:widgets="widgets"
			:layout="layout">
			<template #widget-statuses>
				<div class="titled-grid-item__fill" data-testid="fill-statuses">
					Statuses
				</div>
			</template>
			<template #widget-portal>
				<div class="titled-grid-item__fill" data-testid="fill-portal">
					Portal
				</div>
			</template>
		</CnDetailPage>
	</div>
</template>

<script>
import CnDetailPage from '../../../src/components/CnDetailPage/CnDetailPage.vue'

import '../../../src/css/index.css'

const record = { id: 'ct-1', title: 'Woo-verzoek' }
const schema = { title: 'Case type', properties: { title: { type: 'string', title: 'Title' } } }

export default {
	name: 'TitledGridItem',

	components: { CnDetailPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			store: {
				objects: { 'reg-caseType': { 'ct-1': record } },
				schemas: { caseType: schema },
				objectTypeRegistry: {},
				registerObjectType() {},
				async fetchObject() {
					return record
				},

				async fetchSchema() {
					return schema
				},
			},

			widgets: [
				{ id: 'statuses', type: 'custom', title: 'Statuses, results and attributes' },
				{ id: 'portal', type: 'custom', title: 'Portal' },
			],

			layout: [
				{ id: '1', widgetId: 'statuses', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, showTitle: true },
				{ id: '2', widgetId: 'portal', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 7, showTitle: true },
			],
		}
	},
}
</script>

<style>
.titled-grid-item__fill {
	height: 100%;
	box-sizing: border-box;
	padding: 8px;
	border: 1px solid #888;
}
</style>
