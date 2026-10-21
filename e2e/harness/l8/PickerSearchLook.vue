<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnSearchSelect as DqOverdragen draws "Nieuw team" (?l8=picker-search-look):
  three teams, one chosen.
-->
<template>
	<div class="cn-look-board" style="width: 480px; padding: 16px" data-testid="picker-search-look">
		<CnSearchSelect
			v-model="team"
			inputLabel="Nieuw team"
			labelOutside
			:options="teams" />
	</div>
</template>

<script>
import CnSearchSelect from '../../../src/components/CnSearchSelect/CnSearchSelect.vue'

import '../../../src/css/index.css'

export default {
	name: 'PickerSearchLook',

	components: { CnSearchSelect },

	data() {
		return {
			team: 'legal',
			teams: [
				{ id: 'legal', label: 'Juridische zaken', secondary: '6 leden · bezwaar, beroep en Woo-advies', avatar: true },
				{ id: 'vth', label: 'Vergunningen', secondary: '9 leden · omgevingsvergunningen', avatar: true },
				{ id: 'klant', label: 'Klantcontact', secondary: '4 leden', avatar: true },
			],
		}
	},
}
</script>
