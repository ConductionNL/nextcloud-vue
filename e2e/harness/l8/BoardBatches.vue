<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A self-fetching cases index opened in board view (?l8=board-batches,
  board-loads-every-row, board DqWerkbord): the board asks for one batch of
  500 rows, counts what it holds of what matches, and "Load more" adds the
  next batch. The schema and the case list are stubbed by the spec with
  page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1180px" data-testid="board-batches">
		<CnIndexPage
			title="Alle zaken"
			register="dossiq"
			schema="case"
			viewMode="board"
			:viewModes="['table', 'board']"
			:showRefresh="false"
			:board="{ statusField: 'status', card: { title: 'title' } }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardBatches',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},
}
</script>
