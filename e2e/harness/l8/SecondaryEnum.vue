<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A meetings index whose Orgaan and Locatie columns carry a second line from an
  enum field (?l8=secondary-enum). The schema and list reads are stubbed by
  the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="secondary-enum">
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
	name: 'SecondaryEnum',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [
				{ key: 'title', label: 'Vergadering' },
				{ key: 'bodyName', label: 'Orgaan', secondary: 'meetingType' },
				{ key: 'location', label: 'Locatie', secondary: 'meetingMode' },
			],
		}
	},
}
</script>
