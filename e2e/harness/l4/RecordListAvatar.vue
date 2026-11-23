<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list whose rows lead with the initials of the customer
  (?l4=record-list-avatar). The list request is stubbed by the spec.
-->
<template>
	<div class="l4-avatar" data-testid="l4-record-list-avatar">
		<CnRecordListWidget :content="content" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'RecordListAvatar',

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
				meta: '{client.name} · {channel}',
				avatar: '{client.name}',
				extend: ['client'],
			},
		}
	},
}
</script>

<style scoped>
.l4-avatar {
	width: 560px;
}
</style>
