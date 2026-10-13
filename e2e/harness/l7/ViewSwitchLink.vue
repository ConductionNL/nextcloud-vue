<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A view switch whose Board segment opens another page
  (?l7=view-switch-link): table and cards switch in place, the board is a
  page of its own, the map is not offered.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="view-switch-link">
		<CnIndexPage
			title="Zaken"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showRefresh="false"
			:viewSwitch="['table', 'cards', 'board', 'map']"
			:viewSwitchLinks="{ board: { href: '#/zaken/bord' } }"
			:pagination="{ total: 2, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ViewSwitchLink',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: { title: 'Zaak', titlePlural: 'Zaken', properties: { title: { type: 'string', title: 'Zaak' } } },
			columns: [{ key: 'title', label: 'Zaak' }],
			rows: [{ id: '1', title: 'Woo-verzoek 1' }, { id: '2', title: 'Vergunning 2' }],
		}
	},
}
</script>
