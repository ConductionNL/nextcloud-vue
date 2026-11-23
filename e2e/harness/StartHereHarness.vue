<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A start-here attention card in a 360px column (?starthere=1). The ordered
  query is stubbed by the spec with page.route().
-->
<template>
	<div class="start-here-harness" data-testid="start-here-harness">
		<CnBannerWidget :content="content" />
	</div>
</template>

<script>
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

export default {
	name: 'StartHereHarness',

	components: { CnBannerWidget },

	data() {
		return {
			content: {
				layout: 'attention',
				stacked: true,
				variant: 'info',
				kicker: 'Begin hier',
				title: '{subject.title}',
				reason: '{subject.contactName} wacht al {subject.createdAt|days} dagen.',
				visibleWhen: {
					source: { register: 'pipelinq', schema: 'ticket', filter: { assignee: 'me' }, order: { slaDeadline: 'asc' } },
					field: 'id',
					op: 'notEmpty',
				},

				actions: [{ label: 'Nu beantwoorden', href: '#ticket' }],
			},
		}
	},
}
</script>

<style scoped>
.start-here-harness {
	width: 360px;
}
</style>
