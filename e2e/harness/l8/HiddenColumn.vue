<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A meetings index whose Type column is declared `hidden: true`
  (?l8=hidden-column). The schema and list reads are stubbed by the spec with
  page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="hidden-column">
		<CnIndexPage
			title="Vergaderingen"
			register="decidiq"
			schema="meeting"
			:columns="columns"
			:showRefresh="false" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'HiddenColumn',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [
				{ key: 'title', label: 'Vergadering' },
				{ key: 'meetingType', label: 'Soort', hidden: true },
				{ key: 'location', label: 'Locatie' },
			],
		}
	},
}
</script>
