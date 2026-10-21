<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-retention" data-testid="cn-retention">
		<header class="cn-retention__head">
			<div class="cn-retention__head-text">
				<h3 class="cn-retention__title">
					{{ text(content.title) || t('nextcloud-vue', 'Archiving') }}
				</h3>
				<p class="cn-retention__muted">
					{{ text(content.subtitle) || t('nextcloud-vue', 'What happens to this record once it is closed') }}
				</p>
			</div>
			<!-- Recompute starts in the header (board DqZaakArchivering); the
			     dialog asks for the reason OpenRegister records with it. -->
			<NcButton
				v-if="content.recompute !== false && !loading && !error"
				:disabled="!mayRecompute || busy"
				:title="mayRecompute ? undefined : t('nextcloud-vue', 'Recomputing needs the archivist role')"
				:aria-description="mayRecompute ? undefined : t('nextcloud-vue', 'Recomputing needs the archivist role')"
				:data-testid="mayRecompute ? 'cn-retention-recompute-open' : 'cn-retention-recompute-denied'"
				@click="recomputeOpen = true">
				<template #icon>
					<Refresh :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Recompute nomination') }}
			</NcButton>
		</header>
		<CnRetentionRecomputeDialog
			v-if="recomputeOpen"
			:user="currentUid"
			:busy="busy"
			@close="recomputeOpen = false"
			@confirm="recompute" />

		<NcLoadingIcon v-if="loading" :size="24" />
		<NcEmptyContent v-else-if="error"
			:name="t('nextcloud-vue', 'The archival facts are unavailable')"
			:description="error"
			data-testid="cn-retention-error">
			<template #action>
				<NcButton data-testid="cn-retention-retry" @click="load">
					{{ t('nextcloud-vue', 'Try again') }}
				</NcButton>
			</template>
		</NcEmptyContent>

		<template v-else>
			<p v-if="archived" class="cn-retention__archived" data-testid="cn-retention-archived">
				{{ t('nextcloud-vue', 'Archived on {at} by {by}. {reason}', { at: String(archived.at ?? ''), by: String(archived.by ?? ''), reason: String(archived.reason ?? '') }) }}
			</p>
			<NcNoteCard v-if="disagrees" type="warning" data-testid="cn-retention-disagreement">
				{{ t('nextcloud-vue', 'This record and OpenRegister do not agree on whether it is archived.') }}
			</NcNoteCard>

			<NcNoteCard v-if="nomination && nomination.status === 'unnominatable'" type="warning" data-testid="cn-retention-unnominatable">
				{{ t('nextcloud-vue', 'Nothing could decide what happens to this record.') }}
				{{ String(nomination.unnominatableReason ?? '') }}
			</NcNoteCard>
			<div v-else-if="!nomination" data-testid="cn-retention-pending">
				<dl class="cn-retention__facts">
					<div v-for="fact in pendingFacts" :key="fact.key" class="cn-retention__fact">
						<dt>{{ fact.label }}</dt>
						<dd>{{ fact.value }}</dd>
					</div>
				</dl>
				<NcNoteCard type="info">
					{{ t('nextcloud-vue', 'This record has not been closed yet. Its archival future is recorded when it closes.') }}
				</NcNoteCard>
			</div>
			<dl v-else class="cn-retention__facts" data-testid="cn-retention-facts">
				<div v-for="fact in facts" :key="fact.key" class="cn-retention__fact">
					<dt>{{ fact.label }}</dt>
					<dd :data-testid="`cn-retention-${fact.key}`">
						{{ fact.value }}
					</dd>
				</div>
			</dl>

			<div v-if="outcome" class="cn-retention__outcome" data-testid="cn-retention-outcome">
				<h4>{{ t('nextcloud-vue', 'Outcome') }}</h4>
				<p>{{ t('nextcloud-vue', 'Handed over as {kind} on {at} by {by}.', { kind: String(outcome.kind ?? ''), at: String(outcome.at ?? ''), by: String(outcome.by ?? '') }) }}</p>
				<p v-if="outcome.transferListUuid">
					{{ t('nextcloud-vue', 'Transfer list') }}: {{ outcome.transferListUuid }}
				</p>
			</div>

		</template>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import CnRetentionRecomputeDialog from './CnRetentionRecomputeDialog.vue'
import { readPath } from '../../utils/readPath.js'

/**
 * CnRetentionWidget — the `retention` detail widget: what happens to a
 * record when its business use ends, as OpenRegister decided it. Every value
 * is read off the record's `@self._retention` (appraisal, disposal date,
 * retention period, selection list row, the rule and when it was written)
 * and `@self.archived`; the widget derives nothing, so it can never disagree
 * with the stored decision. A failed read is an error with a retry, never an
 * empty block. A record nothing could nominate is drawn apart from one that
 * is not closed yet. An archivist (or an admin) may ask OpenRegister to
 * recompute the nomination, with a reason. Any app on OpenRegister uses it;
 * dossiq's case Archiving tab is the first.
 *
 * `content`:
 * - `title`, `subtitle`: texts, through the host translate.
 * - `statusField`, `archivedValues`: a record field and the values that mean
 *   archived (`archiveStatus`, `["archived", ...]`); when set, a mismatch with
 *   `@self.archived` is said out loud.
 * - `archivistGroups`: groups that may recompute (default `["archivaris"]`;
 *   admins always may); `recompute: false` hides the control.
 *
 * The record is read fresh from OpenRegister by `register`, `schema` and
 * `objectId` (props, else the bound record's `@self`).
 */
export default {
	name: 'CnRetentionWidget',

	components: { CnRetentionRecomputeDialog, NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard, Refresh },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration (see the component docs).
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

		/** The record's register (else the bound record's `@self.register`). */
		register: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The record's schema (else the bound record's `@self.schema`); a schema object gives its slug.
		 *
		 * @type {string|number|object}
		 */
		schema: {
			type: [String, Number, Object],
			default: '',
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
			error: '',
			record: null,
			/** Whether the recompute dialog is open. */
			recomputeOpen: false,
			busy: false,
		}
	},

	computed: {
		/** @return {object} The bound record's `@self`. */
		boundSelf() {
			return (this.objectData && this.objectData['@self']) || {}
		},

		/** @return {string} The record id. */
		id() {
			return String(this.objectId || (this.objectData && this.objectData.id) || this.boundSelf.id || '')
		},

		/** @return {string} The register. */
		registerRef() {
			return String(this.register || this.boundSelf.register || '')
		},

		/** @return {string} The schema. */
		schemaRef() {
			const s = this.schema || this.boundSelf.schema || ''
			return String(typeof s === 'object' ? (s.slug || s.id || '') : s)
		},

		/** @return {object} The record's `@self`. */
		self() {
			return (this.record && this.record['@self']) || {}
		},

		/** @return {object|null} OpenRegister's stored retention decision. */
		retention() {
			return this.self._retention || null
		},

		/** @return {object|null} The nomination. */
		nomination() {
			return (this.retention && this.retention.nomination) || null
		},

		/** @return {object|null} The hand-over outcome. */
		outcome() {
			return (this.retention && this.retention.outcome) || null
		},

		/** @return {object|null} OpenRegister's archived marker. */
		archived() {
			return this.self.archived || null
		},

		/**
		 * Whether the record's own field and the platform marker disagree.
		 *
		 * @spec openspec/changes/retention-widget/specs/retention-widget/spec.md#requirement-a-record-shows-its-stored-retention
		 * @return {boolean}
		 */
		disagrees() {
			const field = this.content.statusField
			if (!field || !this.record) {
				return false
			}
			const values = Array.isArray(this.content.archivedValues) ? this.content.archivedValues.map(String) : ['archived']
			const saysArchived = values.includes(String(readPath(this.record, field) ?? ''))
			return saysArchived !== Boolean(this.archived)
		},

		/**
		 * The stored facts that have a value, in reading order.
		 *
		 * @spec openspec/changes/retention-widget/specs/retention-widget/spec.md#requirement-a-record-shows-its-stored-retention
		 * @return {Array<{key: string, label: string, value: string}>}
		 */
		facts() {
			const r = this.retention || {}
			const n = this.nomination || {}
			return [
				{ key: 'appraisal', label: t('nextcloud-vue', 'Appraisal'), value: r.appraisal },
				{ key: 'disposal-date', label: t('nextcloud-vue', 'Disposal date'), value: r.disposalDate },
				{ key: 'retention-period', label: t('nextcloud-vue', 'Retention period'), value: r.retentionPeriod },
				{ key: 'selection-list-row', label: t('nextcloud-vue', 'Selection list row'), value: r.selectionListRow },
				{ key: 'rule', label: t('nextcloud-vue', 'Decided by'), value: n.rule },
				{ key: 'decided-at', label: t('nextcloud-vue', 'Written on'), value: n.at },
			].filter((fact) => fact.value !== undefined && fact.value !== null && fact.value !== '').map((fact) => ({ ...fact, value: String(fact.value) }))
		},

		/** @return {Array<{key: string, label: string, value: string}>} The facts of a record not closed yet. */
		pendingFacts() {
			const atClosure = t('nextcloud-vue', 'Decided when it closes')
			return [
				{ key: 'appraisal', label: t('nextcloud-vue', 'Appraisal'), value: atClosure },
				{ key: 'retention-period', label: t('nextcloud-vue', 'Retention period'), value: atClosure },
				{ key: 'disposal-date', label: t('nextcloud-vue', 'Disposal date'), value: atClosure },
				{ key: 'decided-at', label: t('nextcloud-vue', 'Written on'), value: t('nextcloud-vue', 'Not yet') },
			]
		},

		/** @return {string} The signed-in user's id. */
		currentUid() {
			const user = getCurrentUser()
			return String((user && user.uid) || '')
		},

		/**
		 * Whether this user may recompute: an admin or an archivist group member.
		 * Shown disabled otherwise, so the user learns which role it needs.
		 *
		 * @return {boolean}
		 */
		mayRecompute() {
			const user = getCurrentUser()
			if (user && user.isAdmin === true) {
				return true
			}
			const groups = Array.isArray(user && user.groups) ? user.groups : []
			const allowed = Array.isArray(this.content.archivistGroups) ? this.content.archivistGroups : ['archivaris']
			return allowed.some((g) => groups.includes(g))
		},
	},

	mounted() {
		this.load()
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
		 * Read the record fresh from OpenRegister; a failure is an error, never an empty block.
		 *
		 * @spec openspec/changes/retention-widget/specs/retention-widget/spec.md#requirement-a-record-shows-its-stored-retention
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				if (!this.registerRef || !this.schemaRef || !this.id) {
					throw new Error(t('nextcloud-vue', 'This widget has no record to read.'))
				}
				const { data } = await axios.get(generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(this.registerRef)}/${encodeURIComponent(this.schemaRef)}/${encodeURIComponent(this.id)}`))
				this.record = data && typeof data === 'object' ? data : null
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.error = String((body && (body.message || body.error)) || (failure && failure.message) || failure)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Ask OpenRegister to derive the nomination again with the reason the
		 * dialog asked for, then read it back.
		 *
		 * @spec openspec/changes/retention-recompute-header/specs/retention-recompute-header/spec.md#requirement-recomputing-the-nomination-starts-in-the-card-header-and-asks-for-a-reason
		 * @param {string} reason Why it is recomputed.
		 * @return {Promise<void>}
		 */
		async recompute(reason) {
			const why = String(reason ?? '').trim()
			if (this.busy || why === '') {
				return
			}
			this.busy = true
			try {
				await axios.post(generateUrl(`/apps/openregister/api/archival/objects/${encodeURIComponent(this.id)}/nomination/recompute`), { reason: why })
				this.recomputeOpen = false
				await this.load()
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.error = String((body && (body.message || body.error)) || (failure && failure.message) || failure)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-retention {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-retention__head {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px 16px;
}

.cn-retention__head-text {
	display: flex;
	flex: 1 1 260px;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-retention__title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-retention__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-retention__facts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px 24px;
	margin: 0;
}

.cn-retention__fact dt {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-retention__fact dd {
	margin: 0;
	font-weight: 600;
}

</style>
