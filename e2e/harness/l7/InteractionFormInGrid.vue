<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The interaction form as a widget on a real dashboard
  (?l7=interaction-form-in-grid), as on pipelinq's werkplek: the page
  provides the host app's translate, which knows the submit label in Dutch.
-->
<template>
	<div data-testid="interaction-form-in-grid">
		<CnDashboardPage title="Customer Support" :widgets="widgets" :layout="layout" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

const dutch = { 'Save contact moment': 'Contactmoment opslaan', Phone: 'Telefoon' }

export default {
	name: 'InteractionFormInGrid',

	components: { CnDashboardPage },

	provide() {
		return { cnTranslate: (key) => dutch[key] ?? key }
	},

	data() {
		return {
			widgets: [{
				id: 'interaction',
				type: 'interaction-form',
				title: 'New contact moment',
				content: {
					register: 'harness',
					schema: 'contactmoment',
					clientSchema: 'client',
					channels: [{ value: 'telefoon', label: 'Phone' }],
					submitLabel: 'Save contact moment',
				},
			}],

			layout: [{ id: 'wi', widgetId: 'interaction', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 8 }],
		}
	},
}
</script>
