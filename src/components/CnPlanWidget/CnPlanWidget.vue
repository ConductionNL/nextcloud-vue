<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-plan" data-testid="cn-plan">
		<NcLoadingIcon v-if="loading" :size="24" />
		<NcEmptyContent v-else-if="error"
			:name="t('nextcloud-vue', 'The plan is unavailable')"
			:description="error"
			data-testid="cn-plan-error">
			<template #action>
				<NcButton data-testid="cn-plan-retry" @click="load">
					{{ t('nextcloud-vue', 'Try again') }}
				</NcButton>
			</template>
		</NcEmptyContent>
		<ul v-else-if="roots.length > 0" class="cn-plan__tree">
			<li v-for="node in roots" :key="node.uuid" class="cn-plan__node">
				<CnPlanWidgetRow :item="node"
					:busy="busy"
					@enable="enable"
					@transition="transition" />
				<ul v-if="node.children.length > 0" class="cn-plan__children">
					<li v-for="child in node.children" :key="child.uuid" class="cn-plan__node">
						<CnPlanWidgetRow :item="child"
							:busy="busy"
							@enable="enable"
							@transition="transition" />
					</li>
				</ul>
			</li>
		</ul>
		<p v-else class="cn-plan__empty" data-testid="cn-plan-empty">
			{{ text(content.emptyText) || t('nextcloud-vue', 'This record has no plan') }}
		</p>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import CnPlanWidgetRow from './CnPlanWidgetRow.vue'
import { planTree } from '../../utils/planTree.js'

/** The page refresh channel the built-in widgets listen on. */
const PAGE_REFRESH = 'cn:page:refresh'

/**
 * CnPlanWidget — the `plan` detail widget: a record's planned steps (stages,
 * tasks and milestones) as OpenRegister's case layer holds them, read from
 * `/api/cases/{id}`, with the moves OpenRegister allows: start a
 * discretionary item, complete or terminate one. It judges nothing:
 * OpenRegister decides every move and its refusal is shown as it says it.
 * A 404 means the record has no plan; any other failure is an error with a
 * retry, never an empty plan. Any app whose records run on OpenRegister's
 * case layer uses it; dossiq's case plan is the first.
 *
 * `content`: `emptyText`, through the host translate.
 *
 * The record's id comes from `objectId`, else the bound record.
 */
export default {
	name: 'CnPlanWidget',

	components: { CnPlanWidgetRow, NcButton, NcEmptyContent, NcLoadingIcon },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration: `{ emptyText? }`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The bound record, on a detail page.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
		},

		/** The record's id (else the bound record's). */
		objectId: {
			type: [String, Number],
			default: '',
		},
	},

	data() {
		return {
			loading: true,
			busy: false,
			error: '',
			roots: [],
		}
	},

	computed: {
		/** @return {string} The record id. */
		id() {
			const bound = this.objectData || {}
			return String(this.objectId || bound.id || (bound['@self'] && bound['@self'].id) || '')
		},
	},

	mounted() {
		subscribe(PAGE_REFRESH, this.load)
		this.load()
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH, this.load)
	},

	methods: {
		t,

		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * The server's sentence for a failure.
		 *
		 * @param {unknown} failure The rejection.
		 * @return {string}
		 */
		messageOf(failure) {
			const response = failure && failure.response
			if (response && response.status === 403) {
				return t('nextcloud-vue', 'You are not allowed to see this plan.')
			}
			const body = response && response.data
			const detail = body && (body.error || body.message)
			return typeof detail === 'string' && detail !== '' ? detail : t('nextcloud-vue', 'The plan could not be loaded. Try again.')
		},

		/**
		 * Read the plan; 404 is "no plan", anything else an error.
		 *
		 * @spec openspec/changes/plan-widget/specs/plan-widget/spec.md#requirement-a-record-shows-its-planned-steps
		 * @return {Promise<void>}
		 */
		async load() {
			if (!this.id) {
				this.loading = false
				return
			}
			this.loading = true
			this.error = ''
			try {
				const { data } = await axios.get(generateUrl(`/apps/openregister/api/cases/${encodeURIComponent(this.id)}`))
				this.roots = data && Array.isArray(data.items) ? planTree(data.items) : []
			} catch (failure) {
				this.roots = []
				if (!(failure && failure.response && failure.response.status === 404)) {
					this.error = this.messageOf(failure)
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Start a discretionary item.
		 *
		 * @param {object} item The plan item.
		 * @return {Promise<void>}
		 */
		enable(item) {
			return this.act(() => axios.post(generateUrl(`/apps/openregister/api/cases/items/${encodeURIComponent(item.uuid)}/enable`), {}))
		},

		/**
		 * Move an item to a target state.
		 *
		 * @param {object} item The plan item.
		 * @param {string} to The target state.
		 * @return {Promise<void>}
		 */
		transition(item, to) {
			return this.act(() => axios.post(generateUrl(`/apps/openregister/api/cases/items/${encodeURIComponent(item.uuid)}/transition`), { to, reason: '' }))
		},

		/**
		 * Run one move, then read the plan again: a move can cascade, so the
		 * next read is the plan, not the write's answer.
		 *
		 * @spec openspec/changes/plan-widget/specs/plan-widget/spec.md#requirement-a-record-shows-its-planned-steps
		 * @param {() => Promise<unknown>} write The move.
		 * @return {Promise<void>}
		 */
		async act(write) {
			this.busy = true
			try {
				await write()
				await this.load()
				emit(PAGE_REFRESH, {})
			} catch (failure) {
				this.error = this.messageOf(failure)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-plan__tree,
.cn-plan__children {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-plan__children {
	padding-inline-start: 24px;
}

.cn-plan__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
