<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-parties" data-testid="cn-object-parties">
		<NcLoadingIcon v-if="loading" :size="24" />

		<NcEmptyContent
			v-else-if="failed"
			:name="label('failed')"
			:description="label('failedDetail')"
			data-testid="cn-object-parties-failed" />

		<NcEmptyContent
			v-else-if="groups.length === 0"
			:name="label('empty')"
			:description="label('emptyDetail')"
			data-testid="cn-object-parties-empty" />

		<template v-else>
			<div
				v-if="kinds"
				class="cn-object-parties__accepted"
				:data-source="kinds.source"
				data-testid="cn-object-parties-accepted">
				<span class="cn-object-parties__accepted-label">{{ label('accepted') }}</span>
				<span
					v-for="(kind, index) in kinds.kinds"
					:key="kindCode(kind)"
					class="cn-status-badge cn-status-badge--default cn-object-parties__accepted-kind"
					data-testid="cn-object-parties-accepted-kind">{{ index + 1 }}. {{ kind.label || kindCode(kind) }}</span>
				<span v-if="kindsSourceText" class="cn-object-parties__muted">{{ kindsSourceText }}</span>
			</div>

			<div
				v-if="verdicts.length > 0"
				class="cn-object-parties__verdicts"
				data-testid="cn-object-parties-verdicts">
				<NcNoteCard
					v-for="verdict in verdicts"
					:key="`${verdict.party}-${verdict.key}`"
					:type="verdict.severity"
					:data-effect="verdict.effect"
					data-testid="cn-object-parties-verdict">
					<strong>{{ verdict.label }}</strong>
					<span>{{ verdict.sentence }}</span>
				</NcNoteCard>
			</div>

			<section
				v-for="group in groups"
				:key="group.key"
				class="cn-object-parties__role"
				:data-role="group.key"
				:aria-labelledby="`${idPrefix}-${group.key}`"
				data-testid="cn-object-parties-role">
				<h4 :id="`${idPrefix}-${group.key}`" class="cn-object-parties__role-label">
					{{ group.label }}
				</h4>
				<ul class="cn-object-parties__list">
					<li
						v-for="party in group.parties"
						:key="`${group.key}-${party.partyUuid || party.contactUid}`"
						class="cn-object-parties__party"
						:data-party="party.partyUuid || party.contactUid"
						data-testid="cn-object-parties-party">
						<span class="cn-object-parties__name">{{ nameOf(party) }}</span>
						<span
							v-if="primary && party.partyUuid === primary"
							class="cn-status-badge cn-status-badge--primary"
							data-testid="cn-object-parties-primary">{{ label('primary') }}</span>
						<span v-if="kindOf(party)" class="cn-object-parties__muted">{{ kindOf(party) }}</span>
						<span
							v-if="notAccepted(party)"
							class="cn-status-badge cn-status-badge--warning"
							data-testid="cn-object-parties-not-accepted">{{ label('notAccepted') }}</span>
						<span
							v-for="(line, index) in extraLinesOf(party)"
							:key="`line-${index}`"
							class="cn-object-parties__muted"
							data-testid="cn-object-parties-extra-line">{{ line }}</span>
						<span v-if="party.email" class="cn-object-parties__muted">{{ party.email }}</span>
						<span
							v-if="representedBy(party)"
							class="cn-object-parties__muted"
							data-testid="cn-object-parties-represented">{{ label('representedBy') }}: {{ representedBy(party) }}</span>
						<span
							v-if="correspondenceOf(party)"
							class="cn-object-parties__muted"
							:data-party-documents="party.partyUuid || party.contactUid"
							data-testid="cn-object-parties-documents">{{ correspondenceOf(party) }}</span>
						<span
							v-if="hasNoSecrecy(party)"
							class="cn-object-parties__muted"
							data-testid="cn-object-parties-no-secrecy">{{ label('noSecrecy') }}</span>
						<span
							v-for="indicator in indicatorsFor(party)"
							:key="`${party.partyUuid}-${indicator.key}`"
							class="cn-status-badge cn-status-badge--default"
							:class="`cn-object-parties__indicator--${indicator.severity}`"
							:data-effect="indicator.effect"
							:title="indicator.verdict"
							data-testid="cn-object-parties-indicator">{{ indicator.label }} · {{ indicator.verdict }}</span>
					</li>
				</ul>
			</section>
		</template>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { conditionalLine } from '../../utils/conditionalLine.js'
import {
	documentsOfParty,
	indicatorsOf,
	indicatorVerdict,
	kindCode,
	representedByMap,
	rolesInOrder,
} from '../../utils/objectParties.js'
import { readPath } from '../../utils/readPath.js'

let uid = 0

/**
 * The default words, keyed as `content.labels` overrides them.
 *
 * @return {object} The labels.
 */
function defaultLabels() {
	return {
		failed: t('nextcloud-vue', 'The parties could not be read'),
		failedDetail: t('nextcloud-vue', 'OpenRegister did not answer. Nothing has been removed.'),
		empty: t('nextcloud-vue', 'No parties yet'),
		emptyDetail: t('nextcloud-vue', 'Add a party to record who this is for and who acts on it.'),
		accepted: t('nextcloud-vue', 'Accepted kinds'),
		primary: t('nextcloud-vue', 'Primary party'),
		notAccepted: t('nextcloud-vue', 'Kind not accepted here'),
		representedBy: t('nextcloud-vue', 'Represented by'),
		noSecrecy: t('nextcloud-vue', 'No secrecy'),
	}
}

/**
 * CnObjectPartiesWidget — the `parties` widget: a record's parties as
 * OpenRegister's party model answers them, grouped by role with the primary
 * party first. Each party shows its kind, its representative and the
 * indicators on it, each with its verdict. A blocking verdict is also a note
 * above the list, so nobody publishes or sends past it.
 *
 * ```json
 * {
 *   "type": "parties",
 *   "content": {
 *     "rolesObjects": { "register": "myapp", "schema": "role", "field": "item" },
 *     "roleLabels": { "applicant": "Applicant" },
 *     "kindsSource": { "url": "/apps/myapp/api/items/@objectId/party-kinds", "enforce": "crm" },
 *     "extraLines": [{ "endpoint": "/apps/myapp/api/items/@objectId/parties/{party}/language", "lines": ["Language: {language}"] }],
 *     "correspondence": { "endpoint": "/apps/myapp/api/items/@objectId/documents", "path": "documents" }
 *   }
 * }
 * ```
 *
 * A failed read says so and is never shown as "no parties".
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-shows-its-parties-by-role
 */
export default {
	name: 'CnObjectPartiesWidget',

	components: { NcEmptyContent, NcLoadingIcon, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The configuration: `rolesSource` (the listing URL, default
		 * OpenRegister's `/parties` of this record), `partySource` (one
		 * party, `{uuid}` filled in), `rolesObjects` (`{ register, schema,
		 * field }`, the role rows that say who represents whom), `roleLabels`,
		 * `kindsSource` (`{ url, enforce?, sourceText? }`), `extraLines`
		 * (`[{ endpoint, path?, valueLabels?, lines }]`, one request per
		 * party, `{party}` filled in), `correspondence` (`{ endpoint, path?,
		 * senderField?, recipientsField? }`), `secrecy` (`{ indicator, kinds }`:
		 * a party of one of those kinds whose record carries no indicator with
		 * that key reads "No secrecy") and `labels`.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The record's id, bound by the detail host. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The record's register slug. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** The record's schema slug. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	data() {
		uid += 1
		return {
			idPrefix: `cn-object-parties-${uid}`,
			loading: true,
			failed: false,
			listing: null,
			partyRecords: {},
			represented: {},
			kinds: null,
			extra: {},
			documents: [],
		}
	},

	computed: {
		/** @return {Array<object>} The role groups, primary first. */
		groups() {
			return rolesInOrder(this.listing, this.translatedMap(this.content?.roleLabels))
		},

		/** @return {string|null} The primary party's uuid. */
		primary() {
			return this.listing?.primary || null
		},

		/** @return {object} The verdict words, translated. */
		verdictLabels() {
			const own = this.content?.labels || {}
			const out = {}
			for (const key of ['verdictPublication', 'verdictSend', 'verdictWarn']) {
				if (typeof own[key] === 'string' && own[key] !== '') {
					out[key] = this.cnTranslate(own[key])
				}
			}
			return out
		},

		/** @return {Array<object>} The blocking verdicts, as notes above the list. */
		verdicts() {
			return indicatorsOf(Object.values(this.partyRecords))
				.map((indicator) => ({
					...indicatorVerdict(indicator, this.verdictLabels),
					party: indicator.party,
					key: indicator.key,
					sentence: this.sentenceFor(indicator),
				}))
				.filter((verdict) => verdict.severity === 'error')
		},

		/** @return {string} Where the accepted kinds come from. */
		kindsSourceText() {
			const texts = this.content?.kindsSource?.sourceText
			if (!this.kinds || !texts || typeof texts !== 'object') {
				return ''
			}
			const text = texts[this.kinds.source] || texts.default || ''
			return text ? this.cnTranslate(text) : ''
		},

		/** @return {Record<string, string>} The kind labels the listing declares. */
		kindLabels() {
			const labels = {}
			for (const kind of this.listing?.kinds || []) {
				if (kind && kind.key) {
					labels[kind.key] = kind.label || kind.key
				}
			}
			return labels
		},

		/** @return {string} A key that changes when the record does. */
		recordKey() {
			return `${this.register}|${this.schema}|${this.objectId}`
		},
	},

	watch: {
		recordKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		kindCode,

		/**
		 * A label: the content's own (translated), else the default.
		 *
		 * @param {string} key The label key.
		 * @return {string}
		 */
		label(key) {
			const own = this.content?.labels && typeof this.content.labels[key] === 'string' ? this.content.labels[key] : ''
			return own !== '' ? this.cnTranslate(own) : defaultLabels()[key]
		},

		/**
		 * A map of manifest words, translated.
		 *
		 * @param {object} map The map.
		 * @return {Record<string, string>}
		 */
		translatedMap(map) {
			const out = {}
			for (const [key, value] of Object.entries(map && typeof map === 'object' ? map : {})) {
				out[key] = typeof value === 'string' ? this.cnTranslate(value) : value
			}
			return out
		},

		/**
		 * An app path with the record's tokens and `{party}` filled in.
		 *
		 * @param {string} template The path.
		 * @param {string} [party] A party uuid.
		 * @return {string}
		 */
		urlOf(template, party = '') {
			const withSlugs = String(template)
				.replaceAll('@register', String(this.register || ''))
				.replaceAll('@schema', String(this.schema || ''))
			return interpolateUrlTokens(withSlugs, { objectId: this.objectId }).replaceAll('{party}', encodeURIComponent(party)).replaceAll('{uuid}', encodeURIComponent(party))
		},

		/**
		 * GET an app path; null when it fails.
		 *
		 * @param {string} path The app path.
		 * @param {object} [params] Query parameters.
		 * @return {Promise<unknown>}
		 */
		async read(path, params) {
			try {
				const { data } = await axios.get(generateUrl(path), params ? { params } : undefined)
				return data ?? null
			} catch {
				return null
			}
		},

		/**
		 * Read the listing, then each party, the representation, the kinds,
		 * the extra lines and the correspondence.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (!this.objectId) {
				this.loading = false
				return
			}
			this.loading = true
			this.failed = false
			this.partyRecords = {}
			this.represented = {}
			this.extra = {}
			this.documents = []
			const listing = await this.read(this.urlOf(this.content?.rolesSource || '/apps/openregister/api/objects/@register/@schema/@objectId/parties'))
			if (!listing || typeof listing !== 'object') {
				this.failed = true
				this.listing = null
				this.loading = false
				return
			}
			this.listing = listing
			const uuids = [...new Set((listing.results || []).map((row) => row && row.partyUuid).filter(Boolean))]
			const partyUrl = this.content?.partySource || '/apps/openregister/api/parties/{uuid}'
			const records = await Promise.all(uuids.map((uuid) => this.read(this.urlOf(partyUrl, uuid))))
			const byUuid = {}
			uuids.forEach((uuid, index) => {
				if (records[index] && typeof records[index] === 'object') {
					byUuid[uuid] = records[index]
				}
			})
			this.partyRecords = byUuid
			await Promise.all([this.loadRepresentation(), this.loadKinds(), this.loadExtraLines(uuids), this.loadCorrespondence()])
			this.loading = false
		},

		/** @return {Promise<void>} Who represents whom, from the role rows. */
		async loadRepresentation() {
			const source = this.content?.rolesObjects
			if (!source || !source.register || !source.schema) {
				return
			}
			const data = await this.read(`/apps/openregister/api/objects/${encodeURIComponent(source.register)}/${encodeURIComponent(source.schema)}`, { [source.field || 'object']: String(this.objectId), _limit: 200 })
			const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
			this.represented = representedByMap(rows)
		},

		/** @return {Promise<void>} The kinds this record accepts. */
		async loadKinds() {
			const source = this.content?.kindsSource
			this.kinds = null
			if (!source || !source.url) {
				return
			}
			const data = await this.read(this.urlOf(source.url))
			this.kinds = data && Array.isArray(data.kinds) ? data : null
		},

		/**
		 * One answer per party per extra line.
		 *
		 * @param {Array<string>} uuids The parties.
		 * @return {Promise<void>}
		 */
		async loadExtraLines(uuids) {
			const lines = Array.isArray(this.content?.extraLines) ? this.content.extraLines : []
			const extra = {}
			await Promise.all(lines.map(async (spec, index) => {
				if (!spec || !spec.endpoint) {
					return
				}
				const answers = await Promise.all(uuids.map((uuid) => this.read(this.urlOf(spec.endpoint, uuid))))
				uuids.forEach((uuid, i) => {
					const answer = spec.path ? readPath(answers[i], spec.path) : answers[i]
					if (answer && typeof answer === 'object') {
						extra[`${index}|${uuid}`] = answer
					}
				})
			}))
			this.extra = extra
		},

		/** @return {Promise<void>} The documents the correspondence counts read. */
		async loadCorrespondence() {
			const spec = this.content?.correspondence
			if (!spec || !spec.endpoint) {
				return
			}
			const data = await this.read(this.urlOf(spec.endpoint))
			const list = spec.path ? readPath(data, spec.path) : data
			this.documents = Array.isArray(list) ? list : []
		},

		/**
		 * The extra lines for a party, each the first of its `lines` that applies.
		 *
		 * @param {object} party The listing row.
		 * @return {Array<string>}
		 */
		extraLinesOf(party) {
			const specs = Array.isArray(this.content?.extraLines) ? this.content.extraLines : []
			return specs.map((spec, index) => {
				const answer = this.extra[`${index}|${party.partyUuid}`]
				if (!answer) {
					return ''
				}
				return conditionalLine(spec.lines || [], this.labelled(answer, spec.valueLabels), (text) => this.cnTranslate(text))
			}).filter((line) => line !== '')
		},

		/**
		 * An answer with its coded values replaced by their labels
		 * (`valueLabels: { language: { nl: "Dutch" } }`; `nl-NL` reads as `nl`).
		 *
		 * @param {object} answer The answer.
		 * @param {object} valueLabels The labels by field and value.
		 * @return {object}
		 */
		labelled(answer, valueLabels) {
			if (!valueLabels || typeof valueLabels !== 'object') {
				return answer
			}
			const out = { ...answer }
			for (const [field, map] of Object.entries(valueLabels)) {
				const raw = answer[field]
				if (typeof raw !== 'string' || !map) {
					continue
				}
				const hit = map[raw] ?? map[raw.toLowerCase().split('-')[0]]
				if (typeof hit === 'string') {
					out[field] = this.cnTranslate(hit)
				}
			}
			return out
		},

		/**
		 * Whether a party's kind is one this record does not accept. Only when
		 * the kinds come from the source named by `kindsSource.enforce`.
		 *
		 * @param {object} party The listing row.
		 * @return {boolean}
		 */
		notAccepted(party) {
			const enforce = this.content?.kindsSource?.enforce
			if (!party?.partyKind || !this.kinds || (enforce && this.kinds.source !== enforce)) {
				return false
			}
			return !this.kinds.kinds.some((kind) => kindCode(kind) === party.partyKind)
		},

		/**
		 * A party's kind: the accepted kind's label, else the listing's, else the code.
		 *
		 * @param {object} party The listing row.
		 * @return {string}
		 */
		kindOf(party) {
			if (!party.partyKind) {
				return ''
			}
			const offered = (this.kinds?.kinds || []).find((kind) => kindCode(kind) === party.partyKind)
			return offered?.label || this.kindLabels[party.partyKind] || party.partyKind
		},

		/**
		 * Who represents this party, by name.
		 *
		 * @param {object} party The listing row.
		 * @return {string}
		 */
		representedBy(party) {
			const uuid = this.represented[party.partyUuid || party.contactUid || ''] || ''
			if (uuid === '') {
				return ''
			}
			const row = (this.listing?.results || []).find((candidate) => candidate?.partyUuid === uuid)
			return row ? this.nameOf(row) : (this.partyRecords[uuid]?.name || uuid)
		},

		/**
		 * A party's name: the listing's, else the party record's, else its id.
		 *
		 * @param {object} party The listing row.
		 * @return {string}
		 */
		nameOf(party) {
			return party.displayName || this.partyRecords[party.partyUuid]?.name || party.contactUid || party.partyUuid || ''
		},

		/**
		 * How many documents a party sent and received.
		 *
		 * @param {object} party The listing row.
		 * @return {string}
		 */
		correspondenceOf(party) {
			const spec = this.content?.correspondence || {}
			const { sent, received } = documentsOfParty(this.documents, party.partyUuid || party.contactUid || '', spec)
			if (sent.length === 0 && received.length === 0) {
				return ''
			}
			if (received.length === 0) {
				return n('nextcloud-vue', '%n document sent', '%n documents sent', sent.length)
			}
			if (sent.length === 0) {
				return n('nextcloud-vue', '%n document received', '%n documents received', received.length)
			}
			return t('nextcloud-vue', '{sent} sent, {received} received', { sent: sent.length, received: received.length })
		},

		/**
		 * Whether to say a party has no secrecy: the record asks for the line, the party
		 * is of one of its kinds, its record is read and carries no secrecy indicator.
		 *
		 * @param {object} party The listing row.
		 * @return {boolean}
		 */
		hasNoSecrecy(party) {
			const secrecy = this.content?.secrecy
			if (!secrecy?.indicator || !(secrecy.kinds || []).includes(party.partyKind)) {
				return false
			}
			const record = this.partyRecords[party.partyUuid]
			if (!record) {
				return false
			}
			return !(record.indicators || []).some((indicator) => indicator?.key === secrecy.indicator)
		},

		/**
		 * The indicators on a party, each with its verdict.
		 *
		 * @param {object} party The listing row.
		 * @return {Array<object>}
		 */
		indicatorsFor(party) {
			const record = this.partyRecords[party.partyUuid]
			if (!record) {
				return []
			}
			return (record.indicators || []).filter(Boolean).map((indicator) => ({ ...indicatorVerdict(indicator, this.verdictLabels), key: indicator.key }))
		},

		/**
		 * The sentence of a blocking verdict, naming the party.
		 *
		 * @param {object} indicator The indicator with `partyName`.
		 * @return {string}
		 */
		sentenceFor(indicator) {
			const name = indicator.partyName || indicator.party
			const own = this.content?.labels || {}
			if (indicatorVerdict(indicator).effect === 'refuse-publication') {
				return own.sentencePublication
					? this.cnTranslate(own.sentencePublication).replaceAll('{party}', name)
					: t('nextcloud-vue', 'Publishing a file on this record is refused, because of {party}.', { party: name }, undefined, { escape: false })
			}
			return own.sentenceSend
				? this.cnTranslate(own.sentenceSend).replaceAll('{party}', name)
				: t('nextcloud-vue', 'A message to {party} is refused.', { party: name }, undefined, { escape: false })
		},
	},
}
</script>

<style scoped>
.cn-object-parties {
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-object-parties__verdicts {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline, 4px);
}

.cn-object-parties__role-label {
	margin: 0 0 var(--default-grid-baseline, 4px) 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-object-parties__list {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline, 4px);
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-object-parties__party {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	padding: var(--default-grid-baseline, 4px);
	border-radius: var(--border-radius, 4px);
}

.cn-object-parties__party:hover {
	background-color: var(--color-background-hover);
}

.cn-object-parties__name {
	font-weight: bold;
}

.cn-object-parties__muted {
	color: var(--color-text-maxcontrast);
}

.cn-object-parties__accepted {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	padding: calc(var(--default-grid-baseline, 4px) * 2) calc(var(--default-grid-baseline, 4px) * 3);
	border-radius: var(--border-radius-large, 10px);
	background-color: var(--color-background-hover);
}

.cn-object-parties__accepted-label {
	font-weight: 600;
}

.cn-object-parties__accepted-kind {
	border: 1px solid var(--color-border-dark);
}
</style>
