<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A reference field that also takes a typed URL (?l7=reference-free-value): a
  portal's logo, stored as a free string that holds a URL or a reference. The
  spec stubs OpenRegister with page.route().
-->
<template>
	<div class="reference-field" data-testid="reference-free-value" style="width: 520px">
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
import CnDetailWidgetHost from '../../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

export default {
	name: 'ReferenceFreeValue',

	components: { CnDetailWidgetHost },

	data() {
		return {
			record: { id: 'p-1', title: 'Gemeente Zuiddrecht', logo: 'https://www.zuiddrecht.nl/logo.svg' },
			widget: {
				id: 'portal-logo',
				type: 'settings-form',
				title: 'Huisstijl',
				content: {
					columns: 1,
					saveLabel: 'Opslaan',
					fields: [
						{ key: 'logo', label: 'Logo', type: 'reference', register: 'portaliq', schema: 'asset', labelField: 'name', emptyLabel: 'Geen logo', valueTemplate: 'openregister://{register}/{schema}/{id}', filter: { kind: 'logo' }, free: true, freeLabel: 'Of een webadres', freePattern: '^https://', freePatternMessage: 'Gebruik een https-adres.' },
					],
				},
			},
		}
	},
}
</script>
