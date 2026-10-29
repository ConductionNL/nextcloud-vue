<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-connections" data-testid="cn-connections">
		<div class="cn-connections__head">
			<p class="cn-connections__summary">
				{{ t('nextcloud-vue', '{shown} of {total} connections {app} declares, checked by integriq', { shown: shown.length, total: rows.length, app: appName || app }) }}
			</p>
			<NcButton
				v-if="addUrl"
				variant="primary"
				:href="addUrl"
				data-testid="cn-connections-add">
				<template #icon>
					<CnIcon name="PowerPlugOutline" :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add integration') }}
			</NcButton>
		</div>
		<div class="cn-connections__filters">
			<div class="cn-connections__chips" role="group" :aria-label="t('nextcloud-vue', 'Status')">
				<button
					v-for="chip in chips"
					:key="chip.id"
					type="button"
					class="cn-connections__chip"
					:class="{ 'cn-connections__chip--on': chip.id === status }"
					:aria-pressed="chip.id === status ? 'true' : 'false'"
					:data-testid="'cn-connections-chip-' + chip.id"
					@click="status = chip.id">
					{{ chip.label }} <span class="cn-connections__chip-count">{{ chip.count }}</span>
				</button>
			</div>
			<NcTextField
				v-model="query"
				class="cn-connections__search"
				:label="t('nextcloud-vue', 'Filter connections')"
				:labelOutside="true"
				:placeholder="t('nextcloud-vue', 'Filter connections')"
				data-testid="cn-connections-filter">
				<template #icon>
					<CnIcon name="Magnify" :size="20" />
				</template>
			</NcTextField>
		</div>
		<div class="cn-connections__body">
			<p v-if="failed" class="cn-connections__empty" role="alert">
				{{ t('nextcloud-vue', 'The connections could not be read.') }}
			</p>
			<ul v-else class="cn-connections__grid">
				<li
					v-for="row in shown"
					:key="row.id"
					class="cn-connections__card"
					data-testid="cn-connections-card">
					<div class="cn-connections__card-head">
						<span class="cn-connections__icon" aria-hidden="true">
							<CnIcon :name="row.icon" :size="20" />
						</span>
						<span class="cn-connections__card-title">
							<strong>{{ row.title }}</strong>
							<span class="cn-connections__meta">{{ row.meta }}</span>
							<CnStatusBadge :label="row.statusLabel" :variant="row.variant" size="small" />
						</span>
					</div>
					<p v-if="row.description" class="cn-connections__text">
						{{ row.description }}
					</p>
					<p
						v-if="row.statusMessage"
						class="cn-connections__note"
						:class="{ 'cn-connections__note--error': row.variant === 'error' }">
						{{ row.statusMessage }}
					</p>
					<span class="cn-connections__card-foot">
						<NcButton
							v-if="row.settingsUrl"
							:variant="row.configured ? 'secondary' : 'tertiary'"
							:href="row.settingsUrl"
							:aria-label="row.configured ? t('nextcloud-vue', 'Open settings for {name}', { name: row.title }) : t('nextcloud-vue', 'Set up {name}', { name: row.title })">
							{{ row.configured ? t('nextcloud-vue', 'Open settings') : t('nextcloud-vue', 'Configure') }}
						</NcButton>
						<span v-else class="cn-connections__meta">{{ t('nextcloud-vue', 'No settings screen yet') }}</span>
					</span>
				</li>
			</ul>
			<aside class="cn-connections__side">
				<section v-if="attention.length > 0" class="cn-connections__aside" data-testid="cn-connections-attention">
					<h3>{{ t('nextcloud-vue', 'Needs attention') }}</h3>
					<div v-for="row in attention" :key="row.id" class="cn-connections__attention">
						<span class="cn-connections__attention-head">
							<strong>{{ row.title }}</strong>
							<CnStatusBadge :label="row.statusLabel" :variant="row.variant" size="small" />
						</span>
						<span class="cn-connections__meta">{{ row.statusMessage }}</span>
					</div>
				</section>
				<section class="cn-connections__aside">
					<h3>{{ t('nextcloud-vue', 'Checked by integriq') }}</h3>
					<p v-if="lastChecked" class="cn-connections__meta">
						{{ t('nextcloud-vue', 'Last checked {when}', { when: lastChecked }) }}
					</p>
					<p class="cn-connections__text">
						{{ t('nextcloud-vue', 'integriq tests each connection and keeps its status. {app} only shows which connections it uses.', { app: appName || app }) }}
					</p>
					<NcButton v-if="addUrl" :href="addUrl" wide>
						{{ t('nextcloud-vue', 'Open integriq') }}
					</NcButton>
				</section>
				<section class="cn-connections__aside">
					<h3>{{ t('nextcloud-vue', 'Add a connection') }}</h3>
					<p class="cn-connections__text">
						{{ t('nextcloud-vue', 'A connection the app has not declared cannot be checked. Add new connections in integriq; Add integration takes you there.') }}
					</p>
				</section>
			</aside>
		</div>
	</div>
</template>

<script>
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'

/** How each integriq status reads and which badge tone it takes. */
const STATUSES = {
	configured: { label: 'Set up', variant: 'success' },
	limited: { label: 'Limited', variant: 'warning' },
	error: { label: 'Error', variant: 'error' },
	failed: { label: 'Error', variant: 'error' },
	unconfigured: { label: 'Not set up', variant: 'default' },
	simulated: { label: 'Simulated', variant: 'info' },
	unavailable: { label: 'Unavailable', variant: 'default' },
}

/** The chips, in board order, and the statuses each one gathers. */
const CHIPS = [
	{ id: 'configured', label: 'Set up', statuses: ['configured'] },
	{ id: 'limited', label: 'Limited', statuses: ['limited'] },
	{ id: 'unconfigured', label: 'Not set up', statuses: ['unconfigured', 'unavailable', 'simulated'] },
	{ id: 'error', label: 'Error', statuses: ['error', 'failed'] },
]

/**
 * "7 okt, 08:12" in the user's language, or '' for no date.
 *
 * @param {string} iso An ISO date-time.
 * @return {string} The moment.
 */
export function checkedMoment(iso) {
	const date = iso ? new Date(iso) : null
	if (!date || Number.isNaN(date.getTime())) {
		return ''
	}
	const locale = (getLanguage() || 'en').replace('_', '-')
	return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')}, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * CnConnectionsPanel — the connections an app declares, as integriq checks
 * them (board PqIntegrations): a card per connection with its kind, when it
 * was checked, its status, what it does and what integriq said, filtered by
 * status chips and a text field, beside what needs attention.
 *
 * A connection's kind ("Telephony") and icon come from its `declaration`, or
 * from the `kinds` the host passes; the kind goes through the host translate.
 */
export default {
	name: 'CnConnectionsPanel',

	components: { CnIcon, CnStatusBadge, NcButton, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The app whose connections are listed. */
		app: { type: String, required: true },
		/** The app's name as people read it ("Pipelinq"). */
		appName: { type: String, default: '' },
		/**
		 * What kind of connection each one is and its icon, by connection key
		 * (`{ cti: { kind: 'Telephony', icon: 'Headset' } }`), for an app whose
		 * declarations cannot carry them. A declaration's own `kind` and `icon` win.
		 */
		kinds: { type: Object, default: () => ({}) },
		/** Where Add integration and Open integriq go. */
		addUrl: { type: String, default: '' },
		/** The register integriq keeps the connections in. */
		register: { type: String, default: 'integriq' },
		/** The schema integriq keeps the connections in. */
		schema: { type: String, default: 'app_connection' },
	},

	data() {
		return { records: [], failed: false, status: 'all', query: '' }
	},

	computed: {
		/** @return {Array<object>} Every connection, ready to draw. */
		rows() {
			return [...this.records]
				.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
				.map((record) => {
					const declaration = { ...(this.kinds[record.key] || {}), ...(record.declaration || {}) }
					const status = STATUSES[record.status] || STATUSES.unconfigured
					const checked = checkedMoment(record.checkedAt)
					const kind = declaration.kind ? this.cnTranslate(declaration.kind) : ''
					return {
						id: record.id || record.key,
						status: record.status || 'unconfigured',
						title: this.cnTranslate(record.title || declaration.title || record.key || ''),
						description: this.cnTranslate(record.description || declaration.description || ''),
						statusMessage: this.cnTranslate(record.statusMessage || ''),
						settingsUrl: record.settingsUrl || '',
						icon: declaration.icon || 'PowerPlugOutline',
						meta: [kind, checked ? t('nextcloud-vue', 'checked {when}', { when: checked }) : t('nextcloud-vue', 'never checked')].filter(Boolean).join(' · '),
						statusLabel: t('nextcloud-vue', status.label),
						variant: status.variant,
						configured: record.status === 'configured' || record.status === 'limited' || record.status === 'error' || record.status === 'failed',
						checkedAt: record.checkedAt || '',
					}
				})
		},

		/** @return {Array<object>} The status chips with their counts. */
		chips() {
			return [
				{ id: 'all', label: t('nextcloud-vue', 'All connections'), count: this.rows.length },
				...CHIPS.map((chip) => ({ id: chip.id, label: t('nextcloud-vue', chip.label), count: this.rows.filter((row) => chip.statuses.includes(row.status)).length })),
			]
		},

		/** @return {Array<object>} The connections the chip and the filter let through. */
		shown() {
			const chip = CHIPS.find((c) => c.id === this.status)
			const words = this.query.trim().toLowerCase()
			return this.rows.filter((row) => (!chip || chip.statuses.includes(row.status))
				&& (words === '' || `${row.title} ${row.meta} ${row.description}`.toLowerCase().includes(words)))
		},

		/** @return {Array<object>} The connections that are limited or failing. */
		attention() {
			return this.rows.filter((row) => row.variant === 'warning' || row.variant === 'error')
		},

		/** @return {string} When integriq last checked any of them. */
		lastChecked() {
			const latest = this.rows.map((row) => row.checkedAt).filter(Boolean).sort().pop()
			return latest ? checkedMoment(latest) : ''
		},
	},

	async mounted() {
		try {
			this.records = await fetchReferenceObjects({ register: this.register, schema: this.schema, filter: { app: this.app }, limit: 200 })
		} catch {
			this.failed = true
		}
	},

	methods: { t },
}
</script>

<style scoped>
.cn-connections {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-connections__head,
.cn-connections__filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.cn-connections__summary {
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-connections__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-connections__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 34px;
	margin: 0;
	padding: 0 14px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: 17px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

.cn-connections__chip--on {
	border-color: var(--color-main-text);
	background: var(--color-main-text);
	color: var(--color-main-background);
}

.cn-connections__search {
	max-width: 300px;
}

.cn-connections__body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 260px;
	gap: 16px;
	align-items: start;
}

.cn-connections__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 16px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-connections__card,
.cn-connections__aside {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 18px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
	background: var(--color-main-background);
}

.cn-connections__aside {
	gap: 12px;
}

.cn-connections__side {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-connections__card-head,
.cn-connections__attention-head {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}

.cn-connections__attention-head {
	justify-content: space-between;
}

.cn-connections__icon {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background: var(--color-background-hover);
}

.cn-connections__card-title {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
}

.cn-connections__card-title strong {
	font-size: 17px;
	line-height: 1.3;
}

/* The foot is ruled off from the text above it, as the board draws it. */
.cn-connections__card-foot {
	display: flex;
	justify-content: flex-end;
	margin-top: auto;
	padding-top: 10px;
	border-top: 1px solid var(--color-border);
}

.cn-connections__aside h3 {
	margin: 0;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.2;
}

/* Each connection that needs attention sits under a rule. */
.cn-connections__attention {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding-top: 10px;
	border-top: 1px solid var(--color-border);
}

.cn-connections__meta {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-connections__text,
.cn-connections__note {
	margin: 0;
	font-size: 13px;
	line-height: 1.45;
}

.cn-connections__note {
	color: var(--color-text-maxcontrast);
}

.cn-connections__note--error {
	color: var(--color-error-text, var(--color-error));
	font-weight: 600;
}

.cn-connections__empty {
	margin: 0;
}

@media (max-width: 900px) {
	.cn-connections__body {
		grid-template-columns: 1fr;
	}
}
</style>
