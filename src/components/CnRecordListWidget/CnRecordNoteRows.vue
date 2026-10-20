<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-record-notes" data-testid="cn-record-list-notes">
		<p class="cn-record-notes__ready" data-testid="cn-record-list-notes-ready">
			<span class="cn-record-notes__ready-figure">{{ readyCount }}</span>
			<span class="cn-record-notes__ready-label">{{ readyLabel }}</span>
		</p>
		<div
			v-for="item in items"
			:key="item.key"
			class="cn-record-notes__row"
			data-testid="cn-record-list-item">
			<div class="cn-record-notes__head">
				<CnStatusBadge
					v-if="item.pill"
					:label="item.pill.label"
					:variant="item.pill.variant"
					size="small" />
				<component
					:is="item.tag"
					v-if="item.title"
					class="cn-record-notes__title"
					:class="{ 'cn-record-notes__title--link': item.tag !== 'div' }"
					v-bind="item.attrs">
					{{ item.title }}
				</component>
				<span v-if="item.meta" class="cn-record-notes__meta">{{ item.meta }}</span>
				<span class="cn-record-notes__spacer" />
				<span
					v-if="item.due"
					class="cn-record-notes__due"
					:class="`cn-record-notes__due--${dueToneOf(item.due)}`"
					data-testid="cn-record-list-due">{{ item.due.text }}</span>
			</div>
			<div class="cn-record-notes__fields">
				<NcTextField
					class="cn-record-notes__field"
					:modelValue="drafts[item.key] || ''"
					:label="fieldLabel"
					:labelOutside="false"
					:placeholder="placeholder"
					:disabled="busy"
					:data-testid="`cn-record-list-note-${item.key}`"
					@update:modelValue="setDraft(item.key, $event)" />
				<div v-if="leaf && leafProvider" class="cn-record-notes__leaf" :data-testid="`cn-record-list-leaf-${item.key}`">
					<CnLeafMountHost
						v-if="leafIsMount"
						:provider="leafProvider"
						:mountProps="leafProps(item.row)" />
					<component :is="leafComponent" v-else-if="leafComponent" v-bind="leafProps(item.row)" />
				</div>
				<NcButton
					variant="secondary"
					:disabled="busy || !hasDraft(item.key)"
					:data-testid="`cn-record-list-record-${item.key}`"
					@click="record(item)">
					{{ recordLabel }}
				</NcButton>
			</div>
			<p
				v-if="leafUnavailable"
				class="cn-record-notes__leaf-missing"
				:data-testid="`cn-record-list-leaf-missing-${item.key}`">
				{{ leafUnavailableText }}
			</p>
		</div>
		<p v-if="error"
			class="cn-record-notes__error"
			role="alert"
			data-testid="cn-record-list-notes-error">
			{{ error }}
		</p>
		<div v-if="recordAll" class="cn-record-notes__all" data-testid="cn-record-list-record-all">
			<div class="cn-record-notes__all-text">
				<h3 v-if="recordAll.title" class="cn-record-notes__all-title">
					{{ recordAll.title }}
				</h3>
				<p v-if="recordAll.text" class="cn-record-notes__all-sentence">
					{{ recordAll.text }}
				</p>
			</div>
			<div class="cn-record-notes__all-actions">
				<NcButton v-if="recordAll.cancel" variant="secondary" :to="recordAll.cancel.to">
					{{ recordAll.cancel.label }}
				</NcButton>
				<NcButton
					variant="primary"
					:disabled="busy || readyCount === 0"
					data-testid="cn-record-list-record-all-button"
					@click="recordEvery">
					<template v-if="recordAll.icon" #icon>
						<CnIcon :name="recordAll.icon" :size="20" />
					</template>
					{{ recordAll.label }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnLeafMountHost from '../CnLeafMountHost/CnLeafMountHost.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'

/** The bus channel every endpoint-bound widget on the page refetches on. */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/**
 * The rows of a record list drawn as notes to record (`presentation:
 * "notes"`, DqDagAfsluiten "Nog open van vandaag"): per row its pill, title,
 * meta and due text, a field for what happened, an optional integration leaf
 * (humaniq's hours) and a button that records the note on the row's own
 * notes endpoint. What is typed and not yet recorded stays in this browser
 * (session storage) and is counted as the "ready to record" figure; one
 * button records every filled row. After a note is recorded the page's
 * endpoint widgets refetch, so the row moves to whatever lists the server
 * keeps of recorded work.
 *
 * @spec openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-collect-and-record-a-note-per-row
 */
export default {
	name: 'CnRecordNoteRows',

	components: { CnIcon, CnLeafMountHost, CnStatusBadge, NcButton, NcTextField },

	props: {
		/** The list's rows as the record list builds them (`key`, `row`, `tag`, `attrs`, `title`, `meta`, `pill`, `due`). */
		items: {
			type: Array,
			default: () => [],
		},

		/**
		 * `noteAction`, already translated: `{ urlField?, url?, bodyField?,
		 * label, fieldLabel, placeholder?, readyLabel, draftsKey?, errorText? }`.
		 */
		action: {
			type: Object,
			required: true,
		},

		/** `recordAll`, already translated: `{ label, title?, text?, icon?, cancel?: { label, to } }`, or null. */
		recordAll: {
			type: Object,
			default: null,
		},

		/** `rowLeaf`: `{ id, app?, register?, objectIdField, schemaField?, schema?, unavailableText? }`, or null. */
		leaf: {
			type: Object,
			default: null,
		},
	},

	setup() {
		const { getById } = useIntegrationRegistry()
		return { getProvider: getById }
	},

	data() {
		return { drafts: this.readDrafts(), busy: false, error: '' }
	},

	computed: {
		/** @return {string} The session storage key of this list's drafts. */
		draftsKey() {
			return `cn-record-list-notes:${this.action.draftsKey || 'default'}`
		},

		/** @return {number} The rows with a note typed and not yet recorded. */
		readyCount() {
			return this.items.filter((item) => this.hasDraft(item.key)).length
		},

		/** @return {string} The label of the ready figure. */
		readyLabel() {
			return this.action.readyLabel || t('nextcloud-vue', 'filled in, not recorded yet')
		},

		/** @return {string} */
		recordLabel() {
			return this.action.label || t('nextcloud-vue', 'Record')
		},

		/** @return {string} */
		fieldLabel() {
			return this.action.fieldLabel || t('nextcloud-vue', 'Note')
		},

		/** @return {string} */
		placeholder() {
			return this.action.placeholder || ''
		},

		/** @return {object|null} The leaf's integration provider, when one is registered. */
		leafProvider() {
			return this.leaf && this.leaf.id ? (this.getProvider(this.leaf.id) || null) : null
		},

		/** @return {boolean} Whether the leaf mounts itself (`renderMode: "mount"`). */
		leafIsMount() {
			const provider = this.leafProvider
			return Boolean(provider) && provider.renderMode === 'mount' && typeof provider.mount === 'function'
		},

		/** @return {object|null} The leaf's component, in component mode. */
		leafComponent() {
			const provider = this.leafProvider
			return provider ? (provider.tab || provider.widget || null) : null
		},

		/**
		 * Whether the leaf's app is installed but the leaf is not available, so
		 * the row says so instead of silently showing no field.
		 *
		 * @return {boolean}
		 */
		leafUnavailable() {
			return Boolean(this.leaf && this.leaf.app && !this.leafProvider && isAppInstalled(this.leaf.app))
		},

		/** @return {string} */
		leafUnavailableText() {
			return this.leaf?.unavailableText || t('nextcloud-vue', 'This field is not available here.')
		},
	},

	watch: {
		drafts: {
			deep: true,
			handler() {
				this.saveDrafts()
			},
		},
	},

	methods: {
		/**
		 * The drafts this browser session kept, by row key.
		 *
		 * @return {Object<string, string>}
		 */
		readDrafts() {
			try {
				const raw = window.sessionStorage.getItem(`cn-record-list-notes:${this.action?.draftsKey || 'default'}`)
				const parsed = raw ? JSON.parse(raw) : {}
				return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
			} catch {
				return {}
			}
		},

		/** @return {void} */
		saveDrafts() {
			try {
				window.sessionStorage.setItem(this.draftsKey, JSON.stringify(this.drafts))
			} catch {
				// Without session storage the drafts live as long as the page.
			}
		},

		/**
		 * The colour of a due text: a term that ended or ends today in the
		 * error colour, one still to come in the warning colour.
		 *
		 * @param {{tone: string}} due The due text.
		 * @return {string} `error`, `warning` or `muted`.
		 */
		dueToneOf(due) {
			if (due.tone === 'danger' || due.tone === 'today') {
				return 'error'
			}
			return due.tone === 'upcoming' ? 'warning' : 'muted'
		},

		/**
		 * @param {string} key The row key.
		 * @param {string} value The typed note.
		 * @return {void}
		 */
		setDraft(key, value) {
			this.drafts = { ...this.drafts, [key]: String(value ?? '') }
		},

		/**
		 * @param {string} key The row key.
		 * @return {boolean} Whether the row has a note typed.
		 */
		hasDraft(key) {
			return String(this.drafts[key] ?? '').trim() !== ''
		},

		/**
		 * The props the row's leaf gets: the row's object, register and schema.
		 *
		 * @param {object} row The row.
		 * @return {object}
		 */
		leafProps(row) {
			const leaf = this.leaf || {}
			return {
				objectId: String(readPath(row, leaf.objectIdField || 'id') ?? ''),
				register: leaf.register || '',
				schema: leaf.schemaField ? String(readPath(row, leaf.schemaField) ?? '') : (leaf.schema || ''),
				surface: 'row',
			}
		},

		/**
		 * The row's notes endpoint: the row's `urlField`, else `url` with
		 * `{field}` filled from the row.
		 *
		 * @param {object} row The row.
		 * @return {string} The URL, or ''.
		 */
		urlOf(row) {
			if (this.action.urlField) {
				return String(readPath(row, this.action.urlField) ?? '')
			}
			const template = String(this.action.url || '')
			return template.replace(/\{([A-Za-z0-9_.]+)\}/g, (_, path) => encodeURIComponent(String(readPath(row, path) ?? '')))
		},

		/**
		 * Record one row's note, then let the page refetch.
		 *
		 * @param {object} item The row item.
		 * @param {boolean} [refresh] Whether to refresh the page after it.
		 * @return {Promise<boolean>} Whether it was recorded.
		 */
		async record(item, refresh = true) {
			const text = String(this.drafts[item.key] ?? '').trim()
			const url = this.urlOf(item.row)
			if (text === '' || url === '') {
				return false
			}
			this.busy = true
			this.error = ''
			try {
				const { default: axios } = await import('@nextcloud/axios')
				await axios.post(prefixUrl(url), { [this.action.bodyField || 'message']: text })
				const { [item.key]: done, ...rest } = this.drafts
				this.drafts = rest
				if (refresh) {
					emit(PAGE_REFRESH_CHANNEL, {})
				}
				return true
			} catch {
				this.error = this.action.errorText || t('nextcloud-vue', 'The note could not be recorded. It is kept here; try again.')
				return false
			} finally {
				this.busy = false
			}
		},

		/**
		 * Record every row with a note, one after another, then refresh once.
		 *
		 * @return {Promise<void>}
		 */
		async recordEvery() {
			const filled = this.items.filter((item) => this.hasDraft(item.key))
			let any = false
			for (const item of filled) {
				any = (await this.record(item, false)) || any
			}
			if (any) {
				emit(PAGE_REFRESH_CHANNEL, {})
			}
		},
	},
}
</script>

<style scoped>
.cn-record-notes {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.cn-record-notes__ready {
	display: flex;
	align-items: baseline;
	gap: 6px;
	margin: 0 0 8px;
	color: var(--color-text-maxcontrast);
}

.cn-record-notes__ready-figure {
	font-weight: 700;
	color: var(--color-main-text);
}

.cn-record-notes__row {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px 0;
	border-top: 1px solid var(--color-border);
}

.cn-record-notes__head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-record-notes__title {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-record-notes__title--link {
	text-decoration: underline;
}

.cn-record-notes__meta {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-notes__spacer {
	flex: 1 1 auto;
}

.cn-record-notes__due {
	font-weight: 600;
}

.cn-record-notes__due--error {
	color: var(--color-error-text);
}

.cn-record-notes__due--warning {
	color: var(--color-warning-text);
}

.cn-record-notes__due--muted {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
}

.cn-record-notes__fields {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 10px;
}

.cn-record-notes__field {
	flex: 1 1 260px;
}

.cn-record-notes__leaf {
	flex: 0 0 auto;
}

.cn-record-notes__leaf-missing,
.cn-record-notes__error {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-record-notes__error {
	color: var(--color-error-text);
}

.cn-record-notes__all {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 8px;
	padding-top: 14px;
	border-top: 1px solid var(--color-border);
}

.cn-record-notes__all-title {
	margin: 0;
	font-size: 16px;
}

.cn-record-notes__all-sentence {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-record-notes__all-actions {
	display: flex;
	gap: 8px;
}
</style>
