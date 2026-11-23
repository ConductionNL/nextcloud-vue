<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The `field-list` widget as a portal's Beheerders card (?fieldlist=1),
  resolved through CnDetailWidgetHost by its registry type. OpenRegister is
  stubbed by the spec with page.route().
-->
<template>
	<div class="field-list-harness" data-testid="field-list-harness">
		<CnDetailWidgetHost
			:widget="widget"
			chrome="card"
			objectId="p-1"
			:object="record"
			register="portaliq"
			schema="portal" />
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

export default {
	name: 'FieldListHarness',

	components: { CnDetailWidgetHost },

	data() {
		return {
			record: {
				id: 'p-1',
				slug: 'zuiddrecht',
				editors: [
					{ userId: 'pieter', displayName: 'Pieter Jansen', role: 'chief-editor' },
					{ userId: 'anouk', displayName: 'Anouk Bakker', role: 'editor' },
				],
			},

			widget: {
				id: 'portal-editors',
				type: 'field-list',
				title: 'Beheerders',
				content: {
					field: 'editors',
					key: 'userId',
					row: { title: 'displayName', titleFallback: 'userId', avatar: true, meta: [{ path: 'role', map: { 'chief-editor': 'Hoofdredacteur', editor: 'Redacteur' } }] },
					add: { label: 'Toevoegen', unique: 'userId', fields: [{ key: 'userId', label: 'Gebruikersnaam', required: true }] },
					remove: { label: 'Verwijderen' },
				},
			},
		}
	},
}
</script>

<style scoped>
.field-list-harness {
	width: 420px;
	padding: 16px;
}
</style>
