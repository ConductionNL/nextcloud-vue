<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An index page with the board header (?l7=header-actions-menu), as board
  DcVergaderingen draws it: the Acties menu beside the header buttons, holding
  a header action, the built-ins the actions bar drops while header buttons
  show, the documentation link and a link action.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="header-actions-menu">
		<CnIndexPage
			title="Vergaderingen"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showTitle="true"
			:selectable="true"
			documentationUrl="https://docs.example.test/vergaderingen"
			documentationLabel="Documentatie"
			:headerActions="headerActions"
			:headerButtons="headerButtons"
			:pagination="{ total: 2, page: 1, pages: 1, limit: 20 }"
			@refresh="refreshed += 1" />
		<p data-testid="header-actions-menu-refreshed">
			{{ refreshed }}
		</p>
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'HeaderActionsMenu',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			refreshed: 0,
			schema: { title: 'Vergadering', titlePlural: 'Vergaderingen', properties: { title: { type: 'string', title: 'Vergadering' } } },
			columns: [{ key: 'title', label: 'Vergadering' }],
			rows: [{ id: '1', title: 'Raadsvergadering' }, { id: '2', title: 'Commissie Ruimte' }],
			headerActions: [
				{ id: 'goto', label: 'Ga naar', handler: 'emit' },
				{ id: 'manual', label: 'Handleiding', type: 'navigate', target: 'https://docs.example.test/handleiding' },
			],

			headerButtons: [
				{ action: 'add', variant: 'primary', label: 'Vergadering toevoegen' },
				{ action: 'export' },
				{ action: 'actions-menu', items: ['goto', 'import', 'copy-selected', 'delete-selected', 'refresh', 'documentation', 'manual'] },
			],
		}
	},
}
</script>
