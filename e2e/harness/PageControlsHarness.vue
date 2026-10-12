<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The page bar (chips, a "show completed" switch, a sort select) over a
  record list that listens to it (?pagecontrols=1). The list request is stubbed
  by the spec with page.route(); the last request's query string is shown.
-->
<template>
	<div class="page-controls-harness" data-testid="page-controls-harness">
		<div class="page-controls-harness__bar">
			<CnWorkspaceFilterWidget :content="bar" />
		</div>
		<CnRecordListWidget :content="list" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

export default {
	name: 'PageControlsHarness',

	components: { CnRecordListWidget, CnWorkspaceFilterWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			bar: {
				layout: 'bar',
				controls: [
					{
						style: 'chips',
						label: 'Toon',
						writes: '@workspace.lens',
						default: 'all',
						options: [{ value: 'all', label: 'Alle', count: 9 }, { value: 'tickets', label: 'Tickets', count: 7 }],
					},
					{ style: 'toggle', label: 'Toon afgerond', writes: '@workspace.showDone', align: 'end' },
					{
						style: 'select',
						label: 'Sortering',
						writes: '@workspace.sort',
						default: 'deadline',
						options: [{ value: 'deadline', label: 'Termijn eerst' }, { value: 'priority', label: 'Prioriteit eerst' }],
					},
				],
			},

			list: {
				register: 'pipelinq',
				schema: 'ticket',
				filter: { assignee: 'me', status: { in: ['new'] } },
				sort: { field: 'title', dir: 'asc' },
				title: '{title}',
				pageControls: {
					sort: { key: 'sort', map: { deadline: { field: 'slaDeadline', dir: 'asc' }, priority: { field: 'priority', dir: 'desc' } } },
					toggle: { key: 'showDone', removes: ['status'] },
				},
			},
		}
	},
}
</script>

<style scoped>
.page-controls-harness {
	width: 1118px;
}

.page-controls-harness__bar {
	box-sizing: border-box;
	margin-bottom: 12px;
	padding: 12px 16px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
}
</style>
