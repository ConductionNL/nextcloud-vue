<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A meetings index whose Komende lens sorts soonest first while the page sorts
  newest first (?l8=lens-order). The list reads are stubbed by the spec with
  page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="lens-order">
		<CnIndexPage
			title="Vergaderingen"
			register="decidiq"
			schema="meeting"
			sortKey="scheduledDate"
			sortOrder="desc"
			:columns="columns"
			:quickFilters="quickFilters"
			:showRefresh="false" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'LensOrder',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [{ key: 'title', label: 'Vergadering' }, { key: 'scheduledDate', label: 'Datum' }],
			quickFilters: [
				{ label: 'Komende', filter: { 'scheduledDate[gte]': '@today' }, sort: { key: 'scheduledDate', order: 'asc' }, default: true },
				{ label: 'Afgerond', filter: { lifecycle: 'closed' } },
			],
		}
	},
}
</script>
