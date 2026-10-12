<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list whose rows carry a priority badge and an age badge
  (?l6=record-list-badges). The list request is stubbed by the spec.
-->
<template>
	<div data-testid="l6-record-list-badges">
		<CnRecordListWidget :content="content" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'RecordListBadges',

	components: { CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			content: {
				register: 'pipelinq',
				schema: 'ticket',
				title: '{title}',
				badges: [
					{ field: 'priority', labels: { urgent: 'Urgent', high: 'Hoog' }, colorMap: { urgent: 'error', high: 'warning' }, hideValues: ['normal', 'low'] },
					{ kind: 'stale', field: 'updatedAt', afterDays: 7, label: 'Stilgevallen {days} dagen', variant: 'warning' },
				],
			},
		}
	},
}
</script>
