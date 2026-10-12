<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list whose meta line is built from parts
  (?l6=record-list-meta-parts). The list request is stubbed by the spec.
-->
<template>
	<div data-testid="l6-record-list-meta-parts">
		<CnRecordListWidget :content="content" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'RecordListMetaParts',

	components: { CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			content: {
				register: 'dossiq',
				schema: 'case',
				title: '{title}',
				meta: { parts: ['{identifier}', '{caseTypeName}', '{handler}'] },
			},
		}
	},
}
</script>
