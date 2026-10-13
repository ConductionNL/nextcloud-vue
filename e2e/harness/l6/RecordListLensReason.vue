<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Two record lists on the Recent lens, one with the app's own wording
  (?l6=record-list-lens-reason). The list request is stubbed by the spec.
-->
<template>
	<div data-testid="l6-record-list-lens-reason">
		<CnRecordListWidget class="l6-lens-default" :content="content" />
		<CnRecordListWidget class="l6-lens-own" :content="ownContent" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

const content = {
	register: 'dossiq',
	schema: 'case',
	title: '{title}',
	filter: { _recent: true },
	emptyText: 'Geen zaken',
}

export default {
	name: 'RecordListLensReason',

	components: { CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			content,
			ownContent: { ...content, lensReasonTexts: { 'recent.audit-trail-disabled': 'Recente zaken vragen om de audit trail.' } },
		}
	},
}
</script>
