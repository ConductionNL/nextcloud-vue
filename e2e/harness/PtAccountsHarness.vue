<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The accounts table (?ptaccounts=1), as the portal accounts board draws it:
  a name column with an initials circle and the e-mail under the name, under
  the board look with `rowTitle: "plain"`.
-->
<template>
	<div class="cn-look-board" data-testid="pt-accounts" style="width: 900px">
		<CnDataTable
			:rows="rows"
			:columns="columns"
			rowTitle="plain"
			rowKey="id" />
	</div>
</template>

<script>
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

import '../../src/css/index.css'

export default {
	name: 'PtAccountsHarness',

	components: { CnDataTable },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [
				{ key: 'displayName', label: 'Naam', widget: 'avatar', secondary: '{email}' },
				{ key: 'audience', label: 'Doelgroep' },
			],

			rows: [
				{ id: 'a1', displayName: 'M. de Wit', email: 'm.dewit@oosthaven.nl', audience: 'Inwoner' },
				{ id: 'a2', displayName: 'P. Ramdin', email: 'p.ramdin@example.nl', audience: 'Ondernemer' },
			],
		}
	},
}
</script>
