<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Table cells in a real browser (?celllabels=1): a boolean cell, so a spec can
  read the check mark's COMPUTED colour against a theme, and a badge column
  on an enum property with x-enum-labels and a raw-keyed colour map. jsdom
  resolves no CSS custom properties, so neither claim can be judged there.
-->
<template>
	<div class="cell-labels-harness">
		<span data-testid="cell-boolean">
			<CnCellRenderer :value="true" :property="{ type: 'boolean' }" />
		</span>
		<span data-testid="cell-badge">
			<CnCellRenderer
				value="active"
				:property="statusProperty"
				widget="badge"
				:widgetProps="{ colorMap: { active: 'success' } }" />
		</span>
	</div>
</template>

<script>
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'

export default {
	name: 'CellLabelsHarness',
	components: { CnCellRenderer },
	data() {
		return {
			statusProperty: {
				type: 'string',
				enum: ['active', 'inactive'],
				'x-enum-labels': { active: 'Active', inactive: 'Inactive' },
			},
		}
	},
}
</script>
