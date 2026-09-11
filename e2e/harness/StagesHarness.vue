<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A case detail surface for the stages widget and the status badge tile
  (?stageswidget=1, ?statbadge=1).

  The widgets resolve through CnDetailWidgetHost by their REGISTRY type, the
  path a manifest placement takes, so a broken registration fails here. The
  record is provided the way CnDetailPage provides it, and it is re-read from
  OpenRegister on `cn:page:refresh`, which is CnDetailPage's own documented
  answer to that channel. Every request is stubbed by the spec with
  page.route(), so the answers are deterministic.
-->
<template>
	<div class="stages-harness">
		<div class="stages-harness__cell" data-testid="stages-harness-widget">
			<CnDetailWidgetHost
				:widget="widget"
				chrome="card"
				object-id="case-1"
				:object="record"
				register="dossiq"
				schema="case" />
		</div>
		<p data-testid="stages-harness-record-status">
			{{ record ? record.status : '' }}
		</p>
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

// dossiq's case page, as the two placements would be declared in its manifest.
const STAGES_CONTENT = {
	currentField: 'status',
	ariaLabel: 'Case progress',
	stagesEndpoint: {
		url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
		path: 'statusTypes',
		labelField: 'name',
		descriptionField: 'description',
		orderField: 'order',
		finalField: 'isFinal',
		resultsPath: 'resultTypes',
	},
	availability: {
		url: '/apps/dossiq/api/case/@objectId/available-transitions',
		path: 'transitions',
		stageField: 'toStatus',
		moveField: 'id',
		allowedField: 'guardsPassed',
		reasonField: 'failedGuards.0.failureMessage',
	},
	transition: {
		kind: 'endpoint',
		url: '/apps/dossiq/api/case/@objectId/transition',
		bodyKey: 'transitionId',
		commentKey: 'comment',
		resultKey: 'resultTypeId',
		errorField: 'failedGuards.0.failureMessage',
	},
	...(params.get('confirm') === '1' ? { confirm: 'always' } : {}),
}

const STATUS_CONTENT = {
	label: 'Status',
	display: 'badge',
	emptyText: 'Unknown',
	objectField: {
		field: 'status',
		resolve: {
			register: 'dossiq',
			schema: 'statusType',
			labelField: 'name',
			variantField: 'isFinal',
			variantMap: { true: 'success', false: 'info' },
		},
	},
	overrides: [
		{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
	],
}

export default {
	name: 'StagesHarness',

	components: { CnDetailWidgetHost },

	setup() {
		// Provided as a REF, the way CnDetailPage provides it, so a re-read
		// record reaches every widget that injected it.
		const record = ref({
			id: 'case-1',
			caseType: 'ct-1',
			status: params.get('status') || 'st-new',
			suspended: params.get('suspended') === '1',
		})
		const context = ref({ objectId: 'case-1', object: record.value, register: 'dossiq', schema: 'case' })
		provide('cnObjectContext', context)
		return { record, context }
	},

	data() {
		return {
			widget: params.has('statbadge')
				? { id: 'case-status', type: 'stat', title: 'Status', content: STATUS_CONTENT }
				: { id: 'case-stages', type: 'stages', title: 'Progress', content: STAGES_CONTENT },
		}
	},

	mounted() {
		this.onRefresh = () => this.reload()
		subscribe('cn:page:refresh', this.onRefresh)
	},

	beforeUnmount() {
		unsubscribe('cn:page:refresh', this.onRefresh)
	},

	methods: {
		/**
		 * Re-read the case, as CnDetailPage does on `cn:page:refresh`.
		 *
		 * @return {Promise<void>}
		 */
		async reload() {
			const response = await fetch('/apps/openregister/api/objects/dossiq/case/case-1')
			if (!response.ok) return
			const record = await response.json()
			this.record = record
			this.context = { ...this.context, object: record }
		},
	},
}
</script>

<style scoped>
.stages-harness__cell {
	width: 720px;
	min-height: 160px;
	display: flex;
	flex-direction: column;
}
</style>
