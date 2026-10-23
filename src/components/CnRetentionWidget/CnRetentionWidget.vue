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
					{{ text(content.pendingNote) || t('nextcloud-vue', 'This record has not been closed yet. Its archival future is recorded when it closes.') }}
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

			<section v-if="content.legalHold" class="cn-retention__section" data-testid="cn-retention-hold">
				<component :is="innerHeadingTag" class="cn-inner-heading">
					{{ t('nextcloud-vue', 'Kept for a procedure') }}
				</component>
				<ul class="cn-retention__rows">
					<li v-for="hold in holds" :key="hold.id" class="cn-retention__row">
						<span class="cn-retention__row-text">
							<span class="cn-retention__row-title">{{ hold.reason || t('nextcloud-vue', 'Legal hold') }}</span>
							<span class="cn-retention__muted">{{ t('nextcloud-vue', 'Placed on {date} by {by}', { date: hold.placedDate, by: hold.placedBy }) }}</span>
						</span>
						<CnStatusBadge :label="t('nextcloud-vue', 'Active')" variant="warning" />
					</li>
					<li v-if="holds.length === 0" class="cn-retention__row">
						<span class="cn-retention__row-text">
							<span class="cn-retention__row-title">{{ t('nextcloud-vue', 'No legal hold') }}</span>
							<span class="cn-retention__muted">{{ t('nextcloud-vue', 'If an objection or appeal runs, destruction is suspended') }}</span>
						</span>
						<CnStatusBadge :label="t('nextcloud-vue', 'None')" />
					</li>
				</ul>
			</section>

			<section v-if="content.transfer" class="cn-retention__section" data-testid="cn-retention-transfer">
				<component :is="innerHeadingTag" class="cn-inner-heading">
					{{ t('nextcloud-vue', 'Transfer to the e-Depot') }}
				</component>
				<ul class="cn-retention__rows">
					<li class="cn-retention__row">
						<span class="cn-retention__row-text">
							<span class="cn-retention__row-title">{{ transfers ? t('nextcloud-vue', 'Goes to the e-Depot') : t('nextcloud-vue', 'Not applicable') }}</span>
							<span class="cn-retention__muted">{{ transfers ? t('nextcloud-vue', 'After the retention period the record is transferred') : t('nextcloud-vue', 'Only records appraised to keep go to the e-Depot') }}</span>
						</span>
						<CnStatusBadge :label="transfers ? t('nextcloud-vue', 'Transfer') : t('nextcloud-vue', 'No transfer')" :variant="transfers ? 'info' : 'default'" />
					</li>
				</ul>
			</section>

			<div v-if="outcome" class="cn-retention__outcome" data-testid="cn-retention-outcome">
				<component :is="innerHeadingTag" class="cn-inner-heading">
					{{ t('nextcloud-vue', 'Outcome') }}
				</component>
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
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import CnRetentionRecomputeDialog from './CnRetentionRecomputeDialog.vue'
import innerHeading from '../../mixins/innerHeading.js'
import { parseDuration } from '../../utils/isoDuration.js'
import { readPath } from '../../utils/readPath.js'
import { referenceLabel } from '../../utils/referenceLabel.js'
import { hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

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
 * - `expected`: before the record closes, the outcome its type expects.
 *   `source: { register, schema, filter }` lists the candidate rules (a case
 *   type's result types, `filter` tokens such as `@object.caseType`
 *   resolved against the record); `fields: { appraisal, period,
 *   selectionListRow }` names their fields; `appraisalLabels` names the
 *   appraisal values; `periodText` writes the period (`{period} after the
 *   decision`); `decidedBy` says who decides; `selectionListLookup:
 *   { url, param?, label? }` reads a selection list URL as words
 *   ("6.1, Ingewilligd"), the URL's last segment when the lookup fails. When the candidates agree the
 *   facts show that outcome, otherwise "Depends on the result". A failed
 *   read keeps the plain facts.
 * - `pendingNote`: the note under the facts of a record not closed yet.
 * - `legalHold: true`: a section with the record's active legal holds
 *   (`@self._retention.legalHold.holds`), or that none applies.
 * - `transfer: { keepValues }`: a section saying whether the record goes to
 *   the e-Depot, from the stored or expected appraisal.
 *
 * The record is read fresh from OpenRegister by `register`, `schema` and
 * `objectId` (props, else the bound record's `@self`).
 */
export default {
	name: 'CnRetentionWidget',

	components: { CnRetentionRecomputeDialog, CnStatusBadge, NcButton, NcEmptyContent, NcLoadingIcon, NcNoteCard, Refresh },

	mixins: [innerHeading],

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
			/** The candidate rules `content.expected` reads, null until read or when unreadable. */
			expectedRows: null,
			/** The words for the agreed selection list URL, read through `expected.selectionListLookup`. */
			selectionListLabel: '',
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

		/**
		 * The outcome the record's type expects before it closes: the agreed
		 * appraisal, period and selection list row of the candidate rules, or
		 * `mixed` when they disagree; null when nothing was read.
		 *
		 * @spec openspec/changes/retention-expected-outcome/specs/retention-widget/spec.md#requirement-an-open-record-shows-the-outcome-its-type-expects
		 * @return {{appraisal: string, period: string, selectionListRow: string, mixed: boolean}|null}
		 */
		expectedOutcome() {
			const rows = this.expectedRows
			if (!Array.isArray(rows) || rows.length === 0) {
				return null
			}
			const fields = { appraisal: 'appraisal', period: 'period', selectionListRow: 'selectionListRow', ...(this.content.expected?.fields || {}) }
			const pick = (row, key) => String(readPath(row, fields[key]) ?? '')
			const outcomes = rows.map((row) => ({ appraisal: pick(row, 'appraisal'), period: pick(row, 'period'), selectionListRow: pick(row, 'selectionListRow') }))
			const first = outcomes[0]
			const agree = outcomes.every((o) => o.appraisal === first.appraisal && o.period === first.period)
			if (first.appraisal === '' && first.period === '') {
				return null
			}
			const sameRow = outcomes.every((o) => o.selectionListRow === first.selectionListRow)
			return agree
				? { ...first, selectionListRow: sameRow ? (this.selectionListLabel || first.selectionListRow) : '', rowsDiffer: !sameRow, mixed: false }
				: { appraisal: '', period: '', selectionListRow: '', rowsDiffer: true, mixed: true }
		},

		/**
		 * The facts of a record not closed yet: the expected outcome where the
		 * type gives one, "decided when it closes" otherwise.
		 *
		 * @spec openspec/changes/retention-expected-outcome/specs/retention-widget/spec.md#requirement-an-open-record-shows-the-outcome-its-type-expects
		 * @return {Array<{key: string, label: string, value: string}>}
		 */
		pendingFacts() {
			const atClosure = t('nextcloud-vue', 'Decided when it closes')
			const expected = this.expectedOutcome
			if (!expected) {
				return [
					{ key: 'appraisal', label: t('nextcloud-vue', 'Appraisal'), value: atClosure },
					{ key: 'retention-period', label: t('nextcloud-vue', 'Retention period'), value: atClosure },
					{ key: 'disposal-date', label: t('nextcloud-vue', 'Disposal date'), value: atClosure },
					{ key: 'decided-at', label: t('nextcloud-vue', 'Written on'), value: t('nextcloud-vue', 'Not yet') },
				]
			}
			const depends = t('nextcloud-vue', 'Depends on the result')
			const config = this.content.expected || {}
			const facts = [
				{ key: 'appraisal', label: t('nextcloud-vue', 'Appraisal'), value: expected.mixed ? depends : this.appraisalLabel(expected.appraisal) },
				{ key: 'retention-period', label: t('nextcloud-vue', 'Retention period'), value: expected.mixed ? depends : this.periodLabel(expected.period) },
			]
			if (expected.selectionListRow || expected.rowsDiffer) {
				facts.push({ key: 'selection-list-row', label: t('nextcloud-vue', 'Selection list row'), value: expected.rowsDiffer ? depends : expected.selectionListRow })
			}
			facts.push({ key: 'disposal-date', label: t('nextcloud-vue', 'Disposal date'), value: atClosure })
			if (config.decidedBy) {
				facts.push({ key: 'rule', label: t('nextcloud-vue', 'Decided by'), value: this.text(config.decidedBy) })
			}
			facts.push({ key: 'decided-at', label: t('nextcloud-vue', 'Written on'), value: t('nextcloud-vue', 'Not yet') })
			return facts.filter((fact) => fact.value !== '')
		},

		/** @return {Array<{id: string, reason: string, placedBy: string, placedDate: string}>} The active legal holds. */
		holds() {
			const hold = (this.retention && this.retention.legalHold) || {}
			const list = Array.isArray(hold.holds) ? hold.holds : []
			return list.map((h, index) => ({ id: String(h.id ?? index), reason: String(h.reason ?? ''), placedBy: String(h.placedBy ?? ''), placedDate: String(h.placedDate ?? '') }))
		},

		/**
		 * Whether the record goes to the e-Depot: its stored appraisal, else
		 * the expected one, is one of `transfer.keepValues`.
		 *
		 * @return {boolean}
		 */
		transfers() {
			const keep = Array.isArray(this.content.transfer?.keepValues) ? this.content.transfer.keepValues.map(String) : ['bewaren', 'blijvend_bewaren', 'retain', 'keep']
			const stored = this.retention && this.retention.appraisal
			const appraisal = stored || (this.expectedOutcome && !this.expectedOutcome.mixed ? this.expectedOutcome.appraisal : '')
			return keep.includes(String(appraisal || ''))
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
		 * An appraisal value in words, through `expected.appraisalLabels`.
		 *
		 * @param {string} value The stored value.
		 * @return {string}
		 */
		appraisalLabel(value) {
			const labels = this.content.expected?.appraisalLabels || {}
			return labels[value] ? this.text(labels[value]) : value
		},

		/**
		 * An ISO period in words ("5 years"), placed in `expected.periodText`.
		 *
		 * @param {string} value The ISO 8601 duration.
		 * @return {string}
		 */
		periodLabel(value) {
			const parsed = parseDuration(value)
			const words = parsed
				? {
						years: () => n('nextcloud-vue', '%n year', '%n years', parsed.amount),
						months: () => n('nextcloud-vue', '%n month', '%n months', parsed.amount),
						weeks: () => n('nextcloud-vue', '%n week', '%n weeks', parsed.amount),
						days: () => n('nextcloud-vue', '%n day', '%n days', parsed.amount),
					}[parsed.unit]
				: null
			const period = words ? words() : value
			const template = this.content.expected?.periodText
			return template ? this.text(template).replace('{period}', period) : period
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
				await this.loadExpected()
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				this.error = String((body && (body.message || body.error)) || (failure && failure.message) || failure)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Read the candidate rules `content.expected` names, for a record that
		 * is not nominated yet. A failure leaves the plain pending facts.
		 *
		 * @spec openspec/changes/retention-expected-outcome/specs/retention-widget/spec.md#requirement-an-open-record-shows-the-outcome-its-type-expects
		 * @return {Promise<void>}
		 */
		async loadExpected() {
			const source = this.content.expected && this.content.expected.source
			this.expectedRows = null
			if (!source || !source.register || !source.schema || this.nomination) {
				return
			}
			const filter = resolveFilterTokens(source.filter || {}, { objectId: this.id, object: this.record })
			if (hasUnresolvedTokens(filter)) {
				return
			}
			try {
				const { data } = await axios.get(generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(source.register)}/${encodeURIComponent(source.schema)}`), { params: { ...filter, _limit: 100 } })
				this.expectedRows = Array.isArray(data?.results) ? data.results : []
				await this.loadSelectionListLabel()
			} catch {
				this.expectedRows = null
			}
		},

		/**
		 * Read the agreed selection list value as words: a URL goes through
		 * `expected.selectionListLookup`, and falls back to its last segment.
		 *
		 * @spec openspec/changes/retention-expected-outcome/specs/retention-widget/spec.md#requirement-an-open-record-shows-the-outcome-its-type-expects
		 * @return {Promise<void>}
		 */
		async loadSelectionListLabel() {
			this.selectionListLabel = ''
			const raw = this.expectedOutcome && !this.expectedOutcome.rowsDiffer ? this.expectedOutcome.selectionListRow : ''
			if (raw === '') {
				return
			}
			this.selectionListLabel = await referenceLabel(raw, this.content.expected?.selectionListLookup || null)
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

.cn-retention__section {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-retention__rows {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-retention__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 0;
	border-top: 1px solid var(--color-border);
}

.cn-retention__row-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-retention__row-title {
	font-weight: 600;
}

</style>
