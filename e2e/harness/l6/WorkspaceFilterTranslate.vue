<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A page bar whose sort select and switch ask a host translate for their texts
  (?l6=workspace-filter-translate).
-->
<template>
	<div data-testid="l6-wf-translate">
		<CnWorkspaceFilterWidget :content="bar" />
		<output data-testid="l6-wf-sort">{{ sort }}</output>
	</div>
</template>

<script>
import { computed, provide, ref } from 'vue'
import CnWorkspaceFilterWidget from '../../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

const dutch = { 'Sort by': 'Sorteren op', Deadline: 'Termijn', Priority: 'Prioriteit', 'Show done': 'Toon afgerond' }

export default {
	name: 'WorkspaceFilterTranslate',

	components: { CnWorkspaceFilterWidget },

	setup() {
		const workspace = ref({})
		provide('cnWorkspaceContext', workspace)
		provide('cnTranslate', (key) => dutch[key] || key)
		return { sort: computed(() => workspace.value.sort ?? '') }
	},

	data() {
		return {
			bar: {
				layout: 'bar',
				controls: [
					{ style: 'toggle', label: 'Show done', writes: '@workspace.showDone' },
					{ style: 'select', inline: true, label: 'Sort by', writes: '@workspace.sort', options: [{ value: 'deadline', label: 'Deadline' }, { value: 'priority', label: 'Priority' }] },
				],
			},
		}
	},
}
</script>
