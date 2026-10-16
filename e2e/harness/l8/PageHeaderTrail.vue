<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A breadcrumb and a meta note under a page title (?l8=page-header-trail,
  page-header-breadcrumb, board DqZaaktypen): a page header and a dashboard
  under the board look, each with `breadcrumb` and a meta note.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="page-header-trail">
		<div data-testid="trail-header">
			<CnPageHeader
				title="Zaaktypen"
				:breadcrumb="{ label: 'Instellingen', href: '#instellingen' }"
				meta="14 zaaktypen" />
		</div>
		<div data-testid="trail-dashboard">
			<CnDashboardPage
				title="Afdelingen"
				description="Week 41 · alle teams"
				:dateRange="dateRange"
				:widgets="widgets"
				:layout="layout"
				:breadcrumb="[{ label: 'Beheer', href: '#beheer' }, { label: 'Organisatie', href: '#organisatie' }]"
				headerMeta="Geldt voor de hele organisatie" />
		</div>
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnPageHeader from '../../../src/components/CnPageHeader/CnPageHeader.vue'

import '../../../src/css/index.css'

export default {
	name: 'PageHeaderTrail',

	components: { CnDashboardPage, CnPageHeader },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			dateRange: { enabled: true, control: 'segmented', placement: 'description', presets: [{ id: 'week', label: 'Deze week', days: 7 }, { id: 'quarter', label: 'Dit kwartaal', days: 90 }, { id: 'year', label: 'Dit jaar', days: 365 }] },
			widgets: [{ id: 'w', type: 'text', title: 'Op tijd beslist per zaaktype', subtitle: 'Dit kwartaal, beslist binnen de termijn', content: { text: 'Woo-verzoek 88 %' } }],
			layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }],
		}
	},
}
</script>
