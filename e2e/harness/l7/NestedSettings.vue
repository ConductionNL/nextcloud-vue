<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The settings widgets on a record whose settings are nested
  (?l7=nested-settings): the sign-up policy and the allowed domains sit under
  `authentication.registration`, a sign-in switch writes through an app endpoint.
  OpenRegister and the endpoint are stubbed by the spec with page.route().
-->
<template>
	<div class="nested-settings" data-testid="nested-settings">
		<CnDetailWidgetHost
			v-for="widget in widgets"
			:key="widget.id"
			:widget="widget"
			chrome="card"
			objectId="p-1"
			:object="record"
			register="portaliq"
			schema="portal" />
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const RECORD = {
	id: 'p-1',
	slug: 'zuiddrecht',
	title: 'Gemeente Zuiddrecht',
	authentication: {
		registration: { policy: 'approval', allowedDomains: ['zuiddrecht.nl'], notify: true },
		methods: { digid: true },
	},
}

export default {
	name: 'NestedSettings',

	components: { CnDetailWidgetHost },

	data() {
		return {
			record: RECORD,
			widgets: [
				{
					id: 'policy',
					type: 'radio-cards',
					title: 'Aanmelden',
					content: {
						field: 'authentication.registration.policy',
						options: [
							{ value: 'closed', label: 'Niemand' },
							{ value: 'approval', label: 'Met goedkeuring' },
							{ value: 'open', label: 'Iedereen' },
						],
					},
				},
				{
					id: 'domains',
					type: 'chips-field',
					title: 'Zonder goedkeuring',
					content: { field: 'authentication.registration.allowedDomains', addLabel: 'Domein', confirmLabel: 'Toevoegen', lowercase: true },
				},
				{
					id: 'form',
					type: 'settings-form',
					title: 'Aanmelden',
					content: {
						columns: 1,
						saveLabel: 'Opslaan',
						fields: [
							{ key: 'authentication.registration.policy', label: 'Beleid', type: 'select', options: [{ value: 'closed', label: 'Niemand' }, { value: 'approval', label: 'Met goedkeuring' }, { value: 'open', label: 'Iedereen' }] },
							{ key: 'title', label: 'Naam' },
						],
					},
				},
				{
					id: 'details',
					type: 'settings-form',
					title: 'Gegevens',
					content: {
						columns: 1,
						saveLabel: 'Opslaan',
						fields: [
							{ key: 'headerVariant', label: 'Kop', type: 'select', default: 'double', options: [{ value: 'double', label: 'Twee regels' }, { value: 'single', label: 'Een regel' }] },
							{ key: 'locales', label: 'Talen', type: 'chips', default: ['nl'], required: true, addLabel: 'Taal', confirmLabel: 'Toevoegen', minItemsMessage: 'Kies minstens een taal.', options: [{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }] },
						],
					},
				},
				{
					id: 'signin',
					type: 'switch-rows',
					title: 'Inloggen',
					content: {
						rows: [{ key: 'authentication.methods.digid', label: 'DigiD' }],
						save: { url: '/apps/portaliq/api/portals/{object.slug}/signin', method: 'PUT', payload: { method: '{field}', enabled: '{value}' } },
					},
				},
			],
		}
	},
}
</script>
