<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The saved-views card of a board dashboard (?l4=saved-views). The Views API and
  the counts are stubbed by the spec with page.route().
-->
<template>
	<div class="l4-saved-views" data-testid="l4-saved-views">
		<CnSavedViewsWidget :content="content" />
	</div>
</template>

<script>
import CnSavedViewsWidget from '../../../src/components/CnSavedViewsWidget/CnSavedViewsWidget.vue'

export default {
	name: 'SavedViews',

	components: { CnSavedViewsWidget },

	data() {
		return { content: { register: 'pipelinq', schema: 'ticket', route: 'Tickets', showCounts: true } }
	},
}
</script>

<style scoped>
.l4-saved-views {
	width: 360px;
}
</style>
