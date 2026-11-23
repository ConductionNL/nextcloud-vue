<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The workspace-filter chips in a 1118px dashboard cell (?lenses=1), and two
  blocks a workspace visibleWhen shows or hides. List counts are stubbed by the
  spec with page.route().
-->
<template>
	<div class="page-lenses-harness" data-testid="page-lenses-harness">
		<CnWorkspaceFilterWidget :content="content" />
		<p v-if="shows(['all', 'tickets'])" data-testid="lens-tickets">
			Tickets list
		</p>
		<p v-if="shows(['all', 'leads'])" data-testid="lens-leads">
			Leads list
		</p>
		<p data-testid="lens-value">
			{{ workspace.lens || '' }}
		</p>
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { evaluateWorkspaceCondition } from '../../src/utils/visibleWhen.js'

export default {
	name: 'PageLensesHarness',

	components: { CnWorkspaceFilterWidget },

	setup() {
		const workspace = ref({})
		provide('cnWorkspaceContext', workspace)
		return { workspace }
	},

	data() {
		return {
			content: {
				style: 'chips',
				label: 'Toon',
				writes: '@workspace.lens',
				default: 'all',
				options: [
					{ value: 'all', label: 'Alle', countFrom: [{ register: 'pipelinq', schema: 'ticket' }, { register: 'pipelinq', schema: 'lead' }] },
					{ value: 'tickets', label: 'Tickets', countFrom: { register: 'pipelinq', schema: 'ticket' } },
					{ value: 'leads', label: 'Leads', countFrom: { register: 'pipelinq', schema: 'lead' } },
					{ value: 'tasks', label: 'Opvolgingen', count: 1 },
				],
			},
		}
	},

	methods: {
		shows(values) {
			return evaluateWorkspaceCondition({ workspace: 'lens', op: 'in', value: values }, this.workspace)
		},
	},
}
</script>

<style scoped>
.page-lenses-harness {
	width: 1118px;
	box-sizing: border-box;
	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
}
</style>
