<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list sorted by the rank of an enum value (?l6=enum-rank-sort).
  The list requests are answered by the spec, which filters and orders like
  the list endpoint does.
-->
<template>
	<div data-testid="l6-enum-rank-sort">
		<CnRecordListWidget :content="content" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'EnumRankSort',

	components: { CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({ sort: 'priority' }))
	},

	data() {
		return {
			content: {
				register: 'pipelinq',
				schema: 'ticket',
				title: '{title}',
				limit: 6,
				sort: { field: 'title', dir: 'asc' },
				pageControls: {
					sort: {
						key: 'sort',
						map: {
							priority: { field: 'priority', rank: ['urgent', 'high', 'normal', 'low'], then: { field: 'title', dir: 'asc' } },
						},
					},
				},
			},
		}
	},
}
</script>
