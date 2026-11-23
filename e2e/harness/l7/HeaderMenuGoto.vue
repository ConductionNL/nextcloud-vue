<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The header Actions menu with "Ga naar" entries (?l7=header-menu-goto), as
  board DcVergaderingen draws them: header actions with `handler: "navigate"`
  and a route. The harness installs a router for this scenario (main.js), so
  the entries are in-app links and clicking one routes.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="header-menu-goto">
		<CnIndexPage
			title="Vergaderingen"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showTitle="true"
			:headerActions="headerActions"
			:headerButtons="headerButtons"
			:pagination="{ total: 2, page: 1, pages: 1, limit: 20 }" />
		<p data-testid="header-menu-goto-route">
			{{ $route ? $route.name : '' }}
		</p>
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'HeaderMenuGoto',

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
				{ id: 'calendar', label: 'Vergaderkalender', handler: 'navigate', route: 'MeetingCalendar' },
				{ id: 'agenda', label: 'Langetermijnagenda', handler: 'navigate', route: 'LongTermAgenda' },
			],

			headerButtons: [
				{ action: 'add', variant: 'primary', label: 'Vergadering toevoegen' },
				{ action: 'actions-menu', items: ['calendar', 'agenda', 'refresh'] },
			],
		}
	},
}
</script>
