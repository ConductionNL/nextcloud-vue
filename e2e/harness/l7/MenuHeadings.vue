<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The header Actions menu grouped as board DcVergaderingen draws it
  (?l7=menu-headings): "Ga naar" over the header actions, a rule, Importeren,
  a rule, "Selectie" over the selection entries, a rule, Vernieuwen and
  Documentatie.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="menu-headings">
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
			:pagination="{ total: 2, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'MenuHeadings',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: { title: 'Vergadering', titlePlural: 'Vergaderingen', properties: { title: { type: 'string', title: 'Vergadering' } } },
			columns: [{ key: 'title', label: 'Vergadering' }],
			rows: [{ id: '1', title: 'Raadsvergadering' }, { id: '2', title: 'Commissie Ruimte' }],
			headerActions: [
				{ id: 'calendar', label: 'Vergaderkalender', handler: 'emit' },
				{ id: 'agenda', label: 'Langetermijnagenda', handler: 'emit' },
			],

			headerButtons: [
				{ action: 'add', variant: 'primary', label: 'Vergadering toevoegen' },
				{
					action: 'actions-menu',
					items: [{ heading: 'Ga naar' }, 'calendar', 'agenda', 'separator', 'import', 'separator', { heading: 'Selectie' }, 'copy-selected', 'delete-selected', 'separator', 'refresh', 'documentation'],
				},
			],
		}
	},
}
</script>
