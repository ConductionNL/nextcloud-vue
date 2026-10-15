<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Week strips (?l7=week-strip-fit): under the board look at 494px, the width
  of dossiq's "Termijnen deze week" card content at 1100 wide, and at 700px;
  and at 494px without the board look, as the control.
-->
<template>
	<div data-testid="week-strip-fit">
		<div class="cn-look-board" style="width: 494px" data-testid="strip-board-494">
			<CnWeekStripWidget :content="content" />
		</div>
		<div class="cn-look-board" style="width: 700px; margin-top: 24px" data-testid="strip-board-700">
			<CnWeekStripWidget :content="content" />
		</div>
		<div style="width: 494px; margin-top: 24px" data-testid="strip-plain-494">
			<CnWeekStripWidget :content="content" />
		</div>
	</div>
</template>

<script>
import CnWeekStripWidget from '../../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'WeekStripFit',

	components: { CnWeekStripWidget },

	data() {
		const today = new Date()
		const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
		return {
			content: {
				emptyText: 'Geen termijnen',
				items: [{ title: 'Bezwaar Van der Berg', meta: 'Z-2026-0412', date: iso }],
			},
		}
	},
}
</script>
