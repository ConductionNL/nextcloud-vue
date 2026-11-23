<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A week strip in a 320px high cell, with a day that holds eight items
  (?l6=week-strip-max-per-day).
-->
<template>
	<div class="l6-week-cell" data-testid="l6-week-strip-max-per-day">
		<CnWeekStripWidget :content="content" />
	</div>
</template>

<script>
import CnWeekStripWidget from '../../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'

export default {
	name: 'WeekStripMaxPerDay',

	components: { CnWeekStripWidget },

	data() {
		const today = new Date()
		const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
		return {
			content: {
				days: 7,
				maxPerDay: 3,
				items: Array.from({ length: 8 }, (_, i) => ({ title: `Termijn ${i + 1}`, meta: `2026-00${i + 1}`, date: iso })),
			},
		}
	},
}
</script>

<style scoped>
.l6-week-cell {
	width: 1100px;
	height: 320px;
}
</style>
