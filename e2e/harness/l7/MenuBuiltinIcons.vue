<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The header Actions menu with the library's own built-ins
  (?l7=menu-builtin-icons) on a page whose app registered no icons: import,
  export and delete-selected must draw their own glyphs, not the "?".
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="menu-builtin-icons">
		<CnIndexPage
			title="Vergaderingen"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showTitle="true"
			:selectable="true"
			:headerButtons="headerButtons"
			:pagination="{ total: 2, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'MenuBuiltinIcons',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: { title: 'Vergadering', titlePlural: 'Vergaderingen', properties: { title: { type: 'string', title: 'Vergadering' } } },
			columns: [{ key: 'title', label: 'Vergadering' }],
			rows: [{ id: '1', title: 'Raadsvergadering' }, { id: '2', title: 'Commissie Ruimte' }],
			headerButtons: [
				{ action: 'add', variant: 'primary', label: 'Vergadering toevoegen' },
				{ action: 'actions-menu', items: ['import', 'export', 'delete-selected'] },
			],
		}
	},
}
</script>
