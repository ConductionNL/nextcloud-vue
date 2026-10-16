<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The detail-page widget host and the index-page stat row pass a widget only
  the content keys it declares (?l8=hosts-declared-props). Each hosts a
  consumer widget whose root component gets a label the widget computes while
  its content carries a `label` of its own.
-->
<template>
	<div style="width: 900px" data-testid="hosts-declared-props">
		<div data-testid="detail-host">
			<CnDetailWidgetHost
				:widget="widget"
				chrome="card"
				objectId="p-1"
				:cnRegistry="registry" />
		</div>
		<div data-testid="index-row">
			<CnIndexPageWidgets :widgets="[widget]" />
		</div>
	</div>
</template>

<script>
import { markRaw } from 'vue'
import CnDetailWidgetHost from '../../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnIndexPageWidgets from '../../../src/components/CnIndexPage/CnIndexPageWidgets.vue'

import '../../../src/css/index.css'

const Badge = { name: 'Badge', props: ['label'], template: '<div><span data-testid="badge">{{ label }}</span><slot /></div>' }

const LabelledWidget = markRaw({
	name: 'LabelledWidget',
	components: { Badge },
	props: { content: { type: Object, default: () => ({}) }, heading: { type: String, default: '' } },
	template: '<Badge label="Computed"><p data-testid="heading">{{ heading }}</p></Badge>',
})

export default {
	name: 'HostsDeclaredProps',

	components: { CnDetailWidgetHost, CnIndexPageWidgets },

	provide() {
		return { cnRegistry: { labelled: LabelledWidget } }
	},

	data() {
		return {
			registry: { labelled: LabelledWidget },
			widget: { id: 'labelled', type: 'labelled', title: 'Labelled', content: { heading: 'Hello', label: 'From content' } },
		}
	},
}
</script>
