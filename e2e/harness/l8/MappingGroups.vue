<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnRegisterMapping with four register groups (?l8=mapping-groups,
  register-mapping-collapsed-groups, pipelinq admin): the groups start closed
  with their configured count and open on a click or Enter. The register list
  is stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 560px" data-testid="mapping-groups">
		<CnRegisterMapping :groups="groups" :configuration="configuration" />
	</div>
</template>

<script>
import CnRegisterMapping from '../../../src/components/CnRegisterMapping/CnRegisterMapping.vue'

import '../../../src/css/index.css'

const types = (names) => names.map((name) => ({ slug: name.toLowerCase(), label: name }))

export default {
	name: 'MappingGroups',

	components: { CnRegisterMapping },

	data() {
		return {
			configuration: { pipelinq_register: '5', client_schema: '28', contact_schema: '29' },
			groups: [
				{ name: 'Pipelinq Objects', registerConfigKey: 'pipelinq_register', types: types(['Client', 'Contact', 'Lead', 'Request', 'Product', 'Pipeline', 'Note', 'Task']) },
				{ name: 'Point of Sale', registerConfigKey: 'pos_register', types: types(['Order', 'Receipt', 'Till', 'Shift']) },
				{ name: 'Appointment Booking', registerConfigKey: 'booking_register', types: types(['Appointment', 'Slot', 'Resource']) },
				{ name: 'Marketing', registerConfigKey: 'marketing_register', types: types(['Campaign', 'Segment', 'Mailing']) },
			],
		}
	},
}
</script>
