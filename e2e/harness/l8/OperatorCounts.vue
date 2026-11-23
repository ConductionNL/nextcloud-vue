<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Quick-filter lenses with counts on a meetings index (?l8=operator-counts):
  two date lenses spelled with the operator in the key (`scheduledDate[gte]`,
  as the decidiq meetings page needs) and one plain equality. The list and
  aggregation endpoints (and the page's own list and schema reads) are stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="operator-counts">
		<CnIndexPage
			title="Vergaderingen"
			register="decidiq"
			schema="meeting"
			:columns="columns"
			:showRefresh="false"
			:quickFilters="quickFilters" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'OperatorCounts',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [{ key: 'title', label: 'Vergadering' }],
			quickFilters: [
				{ label: 'Komende', filter: { 'scheduledDate[gte]': '@today' }, showCount: true },
				{ label: 'Deze maand', filter: { 'scheduledDate[gte]': '2026-10-01', 'scheduledDate[lt]': '2026-11-01' }, showCount: true },
				{ label: 'Afgerond', filter: { lifecycle: 'closed' }, showCount: true },
			],
		}
	},
}
</script>
