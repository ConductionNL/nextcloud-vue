<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-linked-widget" data-testid="cn-linked-widget">
		<ul v-if="linkedRows.length > 0" class="cn-linked-widget__rows">
			<li
				v-for="row in linkedRows"
				:key="row.key"
				class="cn-linked-widget__row"
				data-testid="cn-linked-row">
				<a v-if="row.href" :href="row.href" class="cn-linked-widget__link">
					<CnIcon
						v-if="row.icon"
						:name="row.icon"
						:size="18"
						aria-hidden="true" />
					{{ row.label }}
				</a>
				<button
					v-else-if="row.run"
					type="button"
					class="cn-linked-widget__link"
					@click="row.run()">
					<CnIcon
						v-if="row.icon"
						:name="row.icon"
						:size="18"
						aria-hidden="true" />
					{{ row.label }}
				</button>
				<span v-else class="cn-linked-widget__link">
					<CnIcon
						v-if="row.icon"
						:name="row.icon"
						:size="18"
						aria-hidden="true" />
					{{ row.label }}
				</span>
			</li>
		</ul>
		<p v-if="emptyLine" class="cn-linked-widget__empty" data-testid="cn-linked-empty">
			{{ emptyLine }}
		</p>
		<span v-if="emptyActions.length > 0" class="cn-linked-widget__actions">
			<button
				v-for="action in emptyActions"
				:key="action.key"
				type="button"
				class="cn-linked-widget__action"
				data-testid="cn-linked-action"
				@click="action.run()">
				{{ action.label }}
			</button>
		</span>
		<!-- The leaves run here, unseen: each reads its own data and reports
		     a summary through `onSummary`; this card draws the rows. -->
		<div hidden class="cn-linked-widget__leaves">
			<CnLeafMountHost
				v-for="provider in providers"
				:key="provider.id"
				:provider="provider"
				:mountProps="mountPropsById[provider.id]" />
		</div>
	</div>
</template>

<script>
import { getLanguage, translate as t } from '@nextcloud/l10n'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnLeafMountHost from '../CnLeafMountHost/CnLeafMountHost.vue'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

/**
 * Join nouns as a sentence list in the user's language ("a, b en c").
 *
 * @param {string[]} items The nouns.
 * @return {string} The list.
 */
function joinList(items) {
	try {
		return new Intl.ListFormat((getLanguage() || 'en').replace('_', '-'), { style: 'long', type: 'conjunction' }).format(items)
	} catch {
		return items.join(', ')
	}
}

/**
 * CnLinkedWidget — the `linked` widget: one card that lists what other apps
 * hold for this record (DqZaak "Gekoppeld").
 *
 * `content.leaves` names the mount-mode integration leaves, in order. Each is
 * mounted out of sight with an `onSummary(summary)` prop and reports
 * `{ count, noun, rows?, actions? }`: a leaf with something linked draws its
 * rows (`{ label, href?, run?, icon? }`); the leaves with nothing linked share
 * one line ("Leges, contract en projecten: niets gekoppeld") followed by their
 * actions. A leaf whose app is absent is not registered and is left out.
 *
 * @spec openspec/changes/linked-integrations-card/specs/linked-integrations-card/spec.md#requirement-one-card-lists-the-linked-integrations-of-a-record
 */
export default {
	name: 'CnLinkedWidget',

	components: { CnIcon, CnLeafMountHost },

	props: {
		/** `{ leaves: string[] }`: the integration ids, in the order to list them. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The record's register. */
		register: {
			type: String,
			default: '',
		},

		/** The record's schema. */
		schema: {
			type: String,
			default: '',
		},
	},

	setup() {
		const { integrations, getById } = useIntegrationRegistry()
		return { integrations, getById }
	},

	data() {
		return {
			/** The latest summary each leaf reported, by integration id. */
			summaries: {},
		}
	},

	computed: {
		/** @return {string[]} The configured leaf ids. */
		leafIds() {
			const leaves = this.content && this.content.leaves
			return Array.isArray(leaves) ? leaves.filter((id) => typeof id === 'string' && id !== '') : []
		},

		/** @return {object[]} The registered mount-mode providers, in the configured order. */
		providers() {
			// Read so a leaf that registers after this card renders still joins it.
			void this.integrations
			return this.leafIds
				.map((id) => this.getById(id))
				.filter((p) => p && p.renderMode === 'mount' && typeof p.mount === 'function' && typeof p.unmount === 'function')
		},

		/** @return {object} The mount props per leaf. */
		mountPropsById() {
			const context = { register: this.register, schema: this.schema, objectId: String(this.objectId || '') }
			const out = {}
			for (const provider of this.providers) {
				out[provider.id] = {
					surface: 'detail-page',
					...context,
					integrationContext: { ...context },
					onSummary: (summary) => this.onSummary(provider.id, summary),
				}
			}
			return out
		},

		/** @return {Array<{id: string, summary: object}>} The reported summaries, in order. */
		reported() {
			return this.providers
				.filter((p) => this.summaries[p.id])
				.map((p) => ({ id: p.id, summary: this.summaries[p.id] }))
		},

		/** @return {object[]} The rows of the leaves that have something linked. */
		linkedRows() {
			const rows = []
			for (const { id, summary } of this.reported) {
				if (summary.count <= 0) {
					continue
				}
				const own = summary.rows.length > 0
					? summary.rows
					: [{ label: `${summary.noun} (${summary.count})` }]
				own.forEach((row, index) => rows.push({ ...row, key: `${id}-${index}` }))
			}
			return rows
		},

		/** @return {object[]} The leaves with nothing linked. */
		emptyLeaves() {
			return this.reported.filter(({ summary }) => summary.count <= 0)
		},

		/** @return {string} "Leges, contract en projecten: niets gekoppeld", or ''. */
		emptyLine() {
			const nouns = this.emptyLeaves.map(({ summary }) => summary.noun).filter((noun) => noun !== '')
			if (nouns.length === 0) {
				return ''
			}
			const list = joinList(nouns)
			return t('nextcloud-vue', '{things}: nothing linked', { things: list.charAt(0).toUpperCase() + list.slice(1) })
		},

		/** @return {object[]} The actions of the leaves with nothing linked. */
		emptyActions() {
			const actions = []
			for (const { id, summary } of this.emptyLeaves) {
				summary.actions.forEach((action, index) => actions.push({ ...action, key: `${id}-${index}` }))
			}
			return actions
		},
	},

	methods: {
		/**
		 * Keep a leaf's summary, normalised.
		 *
		 * @param {string} id The integration id.
		 * @param {{count?: number, noun?: string, rows?: Array, actions?: Array}} summary What the leaf reported.
		 */
		onSummary(id, summary) {
			const s = summary && typeof summary === 'object' ? summary : {}
			const usableRow = (row) => row && typeof row.label === 'string' && row.label !== ''
			const usableAction = (action) => action && typeof action.run === 'function' && typeof action.label === 'string' && action.label !== ''
			this.summaries = {
				...this.summaries,
				[id]: {
					count: Number.isFinite(s.count) ? s.count : 0,
					noun: typeof s.noun === 'string' ? s.noun : '',
					rows: Array.isArray(s.rows) ? s.rows.filter(usableRow) : [],
					actions: Array.isArray(s.actions) ? s.actions.filter(usableAction) : [],
				},
			}
		},
	},
}
</script>

<style scoped>
.cn-linked-widget {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.cn-linked-widget__rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-linked-widget__link {
	align-items: center;
	background: none;
	border: 0;
	color: var(--color-main-text);
	display: flex;
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	gap: 10px;
	margin: 0;
	min-height: 0;
	padding: 0;
	text-align: start;
}

a.cn-linked-widget__link,
button.cn-linked-widget__link {
	cursor: pointer;
}

a.cn-linked-widget__link:hover,
button.cn-linked-widget__link:hover {
	text-decoration: underline;
}

.cn-linked-widget__empty {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	margin: 0;
}

.cn-linked-widget__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-linked-widget__action {
	background: none;
	border: 0;
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	margin: 0;
	min-height: 0;
	padding: 0;
}

.cn-linked-widget__action:hover {
	text-decoration: underline;
}
</style>
