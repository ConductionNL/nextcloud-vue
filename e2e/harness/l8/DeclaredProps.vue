<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A dashboard widget gets only the content keys it declares (?l8=declared-props).
  The real CnDashboardPage with a tabs widget whose content names its tab strip,
  and a consumer widget (no `content` prop) whose root component gets a label
  the widget computes while its content carries a `label` of its own.
-->
<template>
	<div style="width: 1100px" data-testid="declared-props">
		<CnDashboardPage
			title="Declared props"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import { markRaw } from 'vue'
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

const Badge = { name: 'Badge', props: ['label'], template: '<span class="l8-badge" data-testid="badge">{{ label }}</span>' }

const LabelledWidget = markRaw({
	name: 'LabelledWidget',
	components: { Badge },
	props: { heading: { type: String, default: '' } },
	template: '<div><p data-testid="heading">{{ heading }}</p><Badge label="Computed" /></div>',
})

export default {
	name: 'DeclaredProps',

	components: { CnDashboardPage },

	provide() {
		return { cnRegistry: { labelled: LabelledWidget } }
	},

	data() {
		return {
			widgets: [
				{ id: 'tabs', type: 'tabs', title: 'Bank', content: { ariaLabel: 'Bank tabs', tabs: [{ label: 'One' }, { label: 'Two' }] } },
				{ id: 'labelled', type: 'labelled', title: 'Labelled', content: { heading: 'Hello', label: 'From content' } },
			],

			layout: [
				{ id: '1', widgetId: 'tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 },
				{ id: '2', widgetId: 'labelled', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 2 },
			],
		}
	},
}
</script>
