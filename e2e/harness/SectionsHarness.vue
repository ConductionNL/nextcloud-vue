<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The `sections` widget in a tab-panel-wide cell (?sectionswidget=1 for headed
  sections, ?sectionswidget=cards for cards in a main and a side column).

  Resolved through CnDetailWidgetHost by its registry type, the path a manifest
  placement takes. One section names a type nothing resolves, so it draws
  nothing and must take no space.
-->
<template>
	<div class="sections-harness">
		<div class="sections-harness__cell" data-testid="sections-harness-widget">
			<CnDetailWidgetHost
				:widget="widget"
				chrome="bare"
				objectId="portal-1"
				:object="record"
				:availableWidgets="siblings"
				register="portaliq"
				schema="portal" />
		</div>
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const cards = typeof window !== 'undefined' && /[?&]sectionswidget=cards/.test(window.location.search)

export default {
	name: 'SectionsHarness',

	components: { CnDetailWidgetHost },

	data() {
		return {
			record: { id: 'portal-1', title: 'Gemeente Zuiddrecht' },
			siblings: [
				{ id: 'details', type: 'text', content: { text: 'Naam, slogan, adres in portaliq.' } },
			],

			widget: {
				id: 'portal-settings',
				type: 'sections',
				content: {
					cards,
					sections: [
						{ key: 'details', title: 'Gegevens van de portal', widgetId: 'details' },
						{ key: 'nothing', title: 'Werkinstructie', widget: { type: 'resolves-to-nothing' } },
						{ key: 'theme', title: 'Huisstijl', widget: { type: 'text', content: { text: 'Zuiddrecht, leesbaar.' } } },
						{ key: 'traffic', title: 'Verkeer meten', column: cards ? 'side' : 'main', widget: { type: 'text', content: { text: 'Zonder cookies.' } } },
					],
				},
			},
		}
	},
}
</script>

<style scoped>
.sections-harness__cell {
	width: 1100px;
	padding: 16px;
}
</style>
