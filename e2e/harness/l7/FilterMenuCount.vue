<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The index toolbar's state under the board look (?l7=filter-menu-count):
  a page with `filterMenu` and no sidebar. `&active=1` mounts it with two
  active filters, `&selected=1` with two selected rows; without them the
  toolbar shows no count, no "Active:" line and no bulk band.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="filter-menu-count">
		<CnIndexPage
			title="Zaken"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showRefresh="false"
			:filterMenu="true"
			:selectable="true"
			:selectedIds="selected"
			:activeFilters="active"
			:pagination="{ total: 3, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'FilterMenuCount',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			active: params.get('active') === '1' ? { status: ['open'], team: ['Woo'] } : {},
			selected: params.get('selected') === '1' ? ['1', '2'] : [],
			schema: {
				title: 'Zaak',
				titlePlural: 'Zaken',
				properties: {
					title: { type: 'string', title: 'Zaak' },
					status: { type: 'string', title: 'Status', enum: ['open', 'closed'] },
					team: { type: 'string', title: 'Team', enum: ['Woo', 'VTH'] },
				},
			},

			columns: [{ key: 'title', label: 'Zaak' }, { key: 'status', label: 'Status' }, { key: 'team', label: 'Team' }],
			rows: [
				{ id: '1', title: 'Woo-verzoek 1', status: 'open', team: 'Woo' },
				{ id: '2', title: 'Woo-verzoek 2', status: 'open', team: 'Woo' },
				{ id: '3', title: 'Vergunning 3', status: 'closed', team: 'VTH' },
			],
		}
	},
}
</script>
