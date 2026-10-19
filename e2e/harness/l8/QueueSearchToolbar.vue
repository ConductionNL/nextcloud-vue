<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The board actions bar with `searchPlacement: "toolbar"` at the width of the
  team queue's list column (?l8=queue-search-toolbar).
-->
<template>
	<div class="cn-look-board" style="width: 800px" data-testid="queue-search-toolbar">
		<CnActionsBar
			layout="board"
			showSearch
			searchPlaceholder="Zoek op zaak, nummer of verzoeker"
			searchPlacement="toolbar"
			showSidebarToggle
			:showViewToggle="true"
			:availableViewModes="['table', 'cards']"
			viewMode="table" />
	</div>
</template>

<script>
import CnActionsBar from '../../../src/components/CnActionsBar/CnActionsBar.vue'

import '../../../src/css/index.css'

export default {
	name: 'QueueSearchToolbar',

	components: { CnActionsBar },
}
</script>
