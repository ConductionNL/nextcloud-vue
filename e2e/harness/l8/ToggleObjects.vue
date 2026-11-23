<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A settings card of switches, one per object (?l8=toggle-objects,
  toggle-table-objects-and-map, board ShInstellingen "Verplichte velden"):
  the toggle-table widget in `each` mode over FieldRequirement objects, with
  no current object. The list and the PATCH are stubbed by the spec with
  page.route().
-->
<template>
	<div class="cn-look-board" style="width: 640px" data-testid="toggle-objects">
		<CnToggleTableWidget :content="content" />
	</div>
</template>

<script>
import CnToggleTableWidget from '../../../src/components/CnToggleTableWidget/CnToggleTableWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'ToggleObjects',

	components: { CnToggleTableWidget },

	data() {
		return {
			content: {
				bind: { mode: 'each', field: 'active', register: 'shillinq', schema: 'FieldRequirement' },
				source: { url: '/apps/openregister/api/objects/shillinq/FieldRequirement?_limit=200', path: 'results', key: 'id', label: 'title', hint: 'reason' },
			},
		}
	},
}
</script>
