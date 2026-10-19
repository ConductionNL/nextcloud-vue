<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Board look cards under a theme that colours and underlines every link with
  `!important`, as thematiq does (?l8=board-card-quiet, board-card-quiet,
  board DqWerkbord): the card title stays dark and plain, and the selection
  checkbox shows only on a hovered or focused card or once a card is selected.
-->
<template>
	<div class="cn-look-board" style="width: 900px" data-testid="board-card-quiet">
		<CnKanbanView
			:rows="rows"
			:statusFieldSchema="field"
			statusField="status"
			:cardRoles="{ title: 'title' }"
			:selectable="true"
			:selectedIds="selected"
			@select="selected = $event" />
	</div>
</template>

<script>
import CnKanbanView from '../../../src/components/CnKanbanView/CnKanbanView.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardCardQuiet',

	components: { CnKanbanView },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			selected: [],
			field: { enum: ['open', 'doing'], enumLabels: { open: 'Ontvangen', doing: 'In behandeling' } },
			rows: [
				{ id: 'c1', status: 'open', title: 'Rapport geluidsoverlast A16' },
				{ id: 'c2', status: 'doing', title: 'Verlichting fietspad Lindelaan' },
			],
		}
	},

	mounted() {
		const theme = document.createElement('style')
		theme.textContent = 'a { color: rgb(0, 0, 238) !important; text-decoration: underline !important; }'
		document.head.appendChild(theme)
	},
}
</script>
