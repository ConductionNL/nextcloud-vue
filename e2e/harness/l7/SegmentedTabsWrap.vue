<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A segmented tabs widget with thirteen tabs in a 686px card under the board
  look (?l7=segmented-tabs-wrap), as dossiq's case page draws it. The look's
  stylesheets are injected by the spec (they are not loaded globally).
-->
<template>
	<div class="cn-look-board" style="width: 686px" data-testid="segmented-tabs-wrap">
		<CnTabsWidget
			:content="content"
			:availableWidgets="widgets"
			objectId="case-1"
			:objectData="{ id: 'case-1', title: 'Dakkapel' }"
			register="dossiq"
			schema="case" />
	</div>
</template>

<script>
import CnTabsWidget from '../../../src/components/CnTabsWidget/CnTabsWidget.vue'

const LABELS = ['Gegevens', 'Bestanden', 'Beoordeling', 'Taken', 'Besluiten', 'Betrokkenen', 'Contactmomenten', 'Termijnen', 'Objecten', 'Notities', 'Relaties', 'Publicatie', 'Historie']

export default {
	name: 'SegmentedTabsWrap',

	components: { CnTabsWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			content: { ariaLabel: 'Zaakonderdelen', variant: 'segmented', tabs: LABELS.map((label, index) => ({ widgetId: `t-${index}`, label })) },
			widgets: LABELS.map((label, index) => ({ id: `t-${index}`, type: 'custom', title: label })),
		}
	},
}
</script>
