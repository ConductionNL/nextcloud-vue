<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Week strips (?l7=week-strip-fit): under the board look at 494px, the width
  of dossiq's "Termijnen deze week" card content at 1100 wide, and at 700px;
  and at 494px without the board look, as the control. Every strip is fixed
  to the week of Wednesday 14 October 2026, with its item and "today" badge
  on that Wednesday, so what is drawn does not depend on the day the test
  runs.
-->
<template>
	<div data-testid="week-strip-fit">
		<div class="cn-look-board" style="width: 494px" data-testid="strip-board-494">
			<CnWeekStripWidget :content="content" :now="now" />
		</div>
		<div class="cn-look-board" style="width: 700px; margin-top: 24px" data-testid="strip-board-700">
			<CnWeekStripWidget :content="content" :now="now" />
		</div>
		<div style="width: 494px; margin-top: 24px" data-testid="strip-plain-494">
			<CnWeekStripWidget :content="content" :now="now" />
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
		return {
			now: new Date(2026, 9, 14, 12),
			content: {
				emptyText: 'Geen termijnen',
				items: [{ title: 'Bezwaar Van der Berg', meta: 'Z-2026-0412', date: '2026-10-14' }],
			},
		}
	},
}
</script>
