<!--
  CnFlowIndexPage — the browse surface over the one flow store.

  Scoped by the `app` prop: OpenConnector passes `openconnector` and sees its
  own, hermiq passes `hermiq`, and OpenRegister passes nothing and sees every
  app's. That single prop is what replaces "a flow register per app" — the
  reason the fleet previously needed a resolver to arbitrate between stores.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-flow-index">
		<div class="cn-flow-index__bar">
			<span class="cn-flow-index__count">
				{{ n('nextcloud-vue', 'Showing %n flow', 'Showing %n flows', store.flows.length) }}
			</span>
			<NcButton type="primary" @click="$emit('create')">
				{{ t('nextcloud-vue', 'New flow') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="store.loading" :size="32" />

		<NcNoteCard v-else-if="store.error" type="error">
			{{ t('nextcloud-vue', 'The flows could not be loaded. This does not mean there are none.') }}
		</NcNoteCard>

		<NcEmptyContent v-else-if="!store.flows.length"
			:name="t('nextcloud-vue', 'No flows yet')"
			:description="t('nextcloud-vue', 'A flow runs a series of steps when something happens — an object changes, a schedule fires, or you run it yourself.')">
			<template #icon>
				<Sitemap :size="20" />
			</template>
		</NcEmptyContent>

		<table v-else class="cn-flow-index__table">
			<thead>
				<tr>
					<th>{{ t('nextcloud-vue', 'Name') }}</th>
					<th>{{ t('nextcloud-vue', 'Trigger') }}</th>
					<th v-if="!app">
						{{ t('nextcloud-vue', 'App') }}
					</th>
					<th>{{ t('nextcloud-vue', 'Status') }}</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="flow in store.flows"
					:key="flow.id"
					class="cn-flow-index__row"
					tabindex="0"
					@click="$emit('open', flow)"
					@keydown.enter="$emit('open', flow)">
					<td>
						<strong>{{ flow.name }}</strong>
						<div class="cn-flow-index__muted">
							{{ flow.description }}
						</div>
					</td>
					<td>{{ flow.trigger || '—' }}</td>
					<td v-if="!app">
						{{ flow.app }}
					</td>
					<td>
						<!--
						  Enabled and dispatchable are NOT the same thing, and the
						  difference is the single most confusing state a flow can
						  be in: a trigger fires with no acting user, so a flow
						  with no owner has no identity to run as and will not
						  start however enabled it looks. Saying "enabled" alone
						  here would make a flow that never runs look healthy.
						-->
						<span v-if="!flow.enabled" class="cn-flow-index__muted">
							{{ t('nextcloud-vue', 'Disabled') }}
						</span>
						<span v-else-if="!flow.owner" class="cn-flow-index__warn">
							{{ t('nextcloud-vue', 'Enabled, but has no owner — it will not start') }}
						</span>
						<span v-else class="cn-flow-index__ok">
							{{ t('nextcloud-vue', 'Enabled') }}
						</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowIndexPage',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		NcNoteCard,
		Sitemap,
	},

	props: {
		/**
		 * Restrict the list to one owning app id. Null lists every app's flows.
		 */
		app: {
			type: String,
			default: null,
		},
	},

	emits: ['open', 'create'],

	setup() {
		return { store: useFlowStore() }
	},

	async mounted() {
		// Deprecated per ADR-096: a flow list is an ordinary index surface and
		// belongs on CnIndexPage (columns + `:objects`), not on a bespoke
		// table. Kept rendering so existing consumers do not break.
		console.warn('CnFlowIndexPage is deprecated — build the flow list on CnIndexPage instead (see hermiq\'s FlowIndex.vue for the template).')
		await this.store.load({ app: this.app })
	},
}
</script>

<style scoped>
.cn-flow-index__bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-block-end: 12px;
}

.cn-flow-index__table {
	inline-size: 100%;
	border-collapse: collapse;
}

.cn-flow-index__table th,
.cn-flow-index__table td {
	padding: 8px;
	text-align: start;
	border-block-end: 1px solid var(--color-border);
}

.cn-flow-index__row {
	cursor: pointer;
}

.cn-flow-index__row:hover {
	background: var(--color-background-hover);
}

.cn-flow-index__muted {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-flow-index__warn {
	color: var(--color-warning-text, var(--color-error-text));
}

.cn-flow-index__ok {
	color: var(--color-success-text);
}
</style>
