<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-redaction" data-testid="cn-redaction-editor">
		<header class="cn-redaction__head">
			<div>
				<h1 class="cn-redaction__title">
					{{ heading }}
				</h1>
				<!-- @slot Under the title: a breadcrumb back to the record. -->
				<slot name="crumbs" />
			</div>
			<div v-if="documents.length > 0" class="cn-redaction__buttons">
				<NcButton data-testid="cn-redaction-previous" :disabled="index === 0 || busy" @click="open(index - 1)">
					{{ t('nextcloud-vue', 'Previous document') }}
				</NcButton>
				<NcButton data-testid="cn-redaction-next" :disabled="index >= documents.length - 1 || busy" @click="open(index + 1)">
					{{ t('nextcloud-vue', 'Next document') }}
				</NcButton>
				<NcButton variant="primary"
					data-testid="cn-redaction-record"
					:disabled="!canRecord"
					@click="record">
					{{ t('nextcloud-vue', 'Record redaction') }}
				</NcButton>
			</div>
		</header>

		<p v-if="loadError"
			class="cn-redaction__error"
			role="alert"
			data-testid="cn-redaction-load-error">
			{{ loadError }}
		</p>
		<p v-else-if="loading" role="status">
			{{ t('nextcloud-vue', 'Loading…') }}
		</p>
		<p v-else-if="documents.length === 0"
			role="status"
			class="cn-redaction__muted"
			data-testid="cn-redaction-empty">
			{{ text(config.emptyText) || t('nextcloud-vue', 'No document here needs redacting.') }}
		</p>
		<template v-else>
			<div class="cn-redaction__bar">
				<span class="cn-redaction__muted" data-testid="cn-redaction-position">
					{{ t('nextcloud-vue', 'Document {index} of {count}', { index: index + 1, count: documents.length }) }}
					<span v-if="current.redactedDocumentRef" class="cn-redaction__pill cn-redaction__pill--accept" data-testid="cn-redaction-done">
						{{ t('nextcloud-vue', 'Redacted copy recorded') }}
					</span>
				</span>
				<template v-if="config.urls && config.urls.upload">
					<NcButton data-testid="cn-redaction-upload" :disabled="busy" @click="$refs.upload.click()">
						{{ t('nextcloud-vue', 'Upload redacted version') }}
					</NcButton>
					<input ref="upload"
						type="file"
						class="hidden-visually"
						data-testid="cn-redaction-upload-input"
						:aria-label="t('nextcloud-vue', 'Upload redacted version')"
						@change="upload($event.target.files)">
				</template>
			</div>
			<p v-if="error"
				class="cn-redaction__error"
				role="alert"
				data-testid="cn-redaction-error">
				{{ error }}
			</p>
			<p v-if="notice" role="status" data-testid="cn-redaction-notice">
				{{ notice }}
			</p>

			<div class="cn-redaction__columns">
				<div class="cn-redaction__document" data-testid="cn-redaction-text">
					<strong>{{ current.title || t('nextcloud-vue', 'Document without a title') }}</strong>
					<p v-if="detecting" role="status">
						{{ t('nextcloud-vue', 'Finding the passages to redact…') }}
					</p>
					<p v-else-if="documentText === ''" class="cn-redaction__muted">
						{{ t('nextcloud-vue', 'No text was extracted from this document.') }}
					</p>
					<p v-else class="cn-redaction__body">
						<template v-for="(segment, at) in segments" :key="at">
							<span v-if="segment.verdict" :class="`cn-redaction__mark cn-redaction__mark--${segment.verdict}`">{{ segment.text }}</span>
							<template v-else>
								{{ segment.text }}
							</template>
						</template>
					</p>
				</div>

				<aside class="cn-redaction__proposal">
					<h2>{{ t('nextcloud-vue', 'Proposal') }}</h2>
					<span class="cn-redaction__muted" data-testid="cn-redaction-count">
						{{ n('nextcloud-vue', '%n passage found. Review each one.', '%n passages found. Review each one.', passages.length) }}
					</span>
					<ul class="cn-redaction__list">
						<li v-for="(passage, at) in passages"
							:key="at"
							class="cn-redaction__passage"
							:data-testid="`cn-redaction-passage-${at}`">
							<span class="cn-redaction__line">
								<strong>{{ labelOf(passage.type) }}: "{{ passage.value }}"</strong>
								<span v-if="passage.verdict" :class="`cn-redaction__pill cn-redaction__pill--${passage.verdict}`">{{ verdictLabel(passage.verdict) }}</span>
							</span>
							<span v-if="passage.locked" class="cn-redaction__muted">{{ t('nextcloud-vue', 'Always redacted by rule') }}</span>
							<span v-else-if="grounds" class="cn-redaction__muted">{{ grounds }}</span>
							<div v-if="!passage.locked"
								class="cn-redaction__verdicts"
								role="group"
								:aria-label="t('nextcloud-vue', 'Verdict for {passage}', { passage: passage.value })">
								<NcButton v-for="verdict in VERDICTS"
									:key="verdict"
									size="small"
									:pressed="passage.verdict === verdict"
									:data-testid="`cn-redaction-verdict-${at}-${verdict}`"
									@update:pressed="setVerdict(at, verdict)">
									{{ verdictLabel(verdict) }}
								</NcButton>
							</div>
							<NcSelect v-if="passage.entity.source === 'officer'"
								:modelValue="typeOptions.find((option) => option.id === passage.type) || null"
								:options="typeOptions"
								:inputLabel="t('nextcloud-vue', 'Passage type')"
								:clearable="false"
								:data-testid="`cn-redaction-type-${at}`"
								@update:modelValue="retype(at, $event)" />
							<NcTextField v-if="passage.verdict === 'adjust'"
								:modelValue="passage.value"
								:label="t('nextcloud-vue', 'Passage text')"
								:data-testid="`cn-redaction-value-${at}`"
								@update:modelValue="adjust(at, $event)" />
						</li>
					</ul>
					<NcButton data-testid="cn-redaction-add" :disabled="busy || detecting || Boolean(current.redactedDocumentRef)" @click="addPassage">
						{{ t('nextcloud-vue', 'Add passage') }}
					</NcButton>
				</aside>
			</div>
		</template>
	</section>
</template>

<script>
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import { readPath } from '../../utils/readPath.js'
import { redactionSegments } from '../../utils/redactionSegments.js'

/** The page refresh channel the built-in widgets listen on. */
const PAGE_REFRESH = 'cn:page:refresh'

/** The verdicts a reviewer gives a passage. */
const VERDICTS = ['accept', 'adjust', 'skip']

/**
 * The server's sentence for a failure, or the fallback.
 *
 * @param {unknown} failure The rejection.
 * @param {string} fallback What to say when the server said nothing.
 * @return {string}
 */
function sentenceOf(failure, fallback) {
	const data = failure && failure.response && failure.response.data
	return String((data && (data.message || data.error)) || fallback)
}

/**
 * CnRedactionEditor — redact the documents of a record, one at a time
 * (board DqLakken): the document text with the passages marked in place,
 * and beside it the proposal, a verdict per passage (agreed, adjust, do not
 * redact), a passage the detection missed added by hand, and Record
 * redaction. It names no procedure: the routes and the passage type labels
 * come from `config`, so dossiq's Woo redaction and filinq's anonymisation
 * use the same editor.
 *
 * The check is the reviewer's: Record redaction is enabled only once every
 * passage has a verdict, and it first records the check of the passages to
 * redact, in the reviewer's name, and only then asks for the redacted copy.
 * A passage marked `locked` (a rule that always applies) starts agreed and
 * cannot be changed. A refusal is shown in the server's words and the
 * upload of a version redacted elsewhere stays offered.
 *
 * `config`:
 * - `urls`: `{ list, detect, check, redact, upload? }`, templates with
 *   `{recordId}` and `{documentRef}`. `list` answers `{ documents: [{
 *   documentRef, title, redactedDocumentRef?, redaction? }] }`; `detect`
 *   answers `{ text, redaction: { entities } }`; `check` receives `{ entities
 *   }`; `redact` and `upload` (a `file` form field) answer `{
 *   redactedDocumentRef, redaction }`.
 * - `typeLabels`: what a passage type is called (`{ PERSON: "Name" }`).
 * - `groundsPath`: a document's grounds (a list) shown under each passage.
 * - `title`, `emptyText`: texts. All through the host translate.
 */
export default {
	name: 'CnRedactionEditor',

	components: { NcButton, NcSelect, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The record whose documents are redacted, for `{recordId}`. */
		recordId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The editor's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['recorded'],

	data() {
		return {
			VERDICTS,
			loading: true,
			loadError: '',
			documents: [],
			index: 0,
			documentText: '',
			passages: [],
			detecting: false,
			busy: false,
			error: '',
			notice: '',
		}
	},

	computed: {
		/** @return {object} The open document. */
		current() {
			return this.documents[this.index] || {}
		},

		/** @return {string} The heading. */
		heading() {
			const own = this.text(this.config.title)
			if (own) {
				return own
			}
			return this.current.title ? t('nextcloud-vue', 'Redact: {title}', { title: this.current.title }) : t('nextcloud-vue', 'Redact documents')
		},

		/** @return {Array<{id: string, label: string}>} The passage types. */
		typeOptions() {
			return Object.keys(this.config.typeLabels || {}).map((type) => ({ id: type, label: this.labelOf(type) }))
		},

		/** @return {string} The open document's grounds. */
		grounds() {
			const list = this.config.groundsPath ? readPath(this.current, this.config.groundsPath) : null
			return Array.isArray(list) ? list.join(', ') : ''
		},

		/** @return {Array<object>} The entities to redact: agreed or adjusted, with text. */
		toRedact() {
			return this.passages
				.filter((p) => p.verdict === 'accept' || p.verdict === 'adjust')
				.map((p) => ({ ...p.entity, value: p.value.trim() }))
				.filter((entity) => entity.value !== '')
		},

		/**
		 * Whether the redaction may be recorded: every passage judged, at least one to redact.
		 *
		 * @spec openspec/changes/redaction-editor/specs/redaction-editor/spec.md#requirement-a-reviewer-redacts-a-records-documents
		 * @return {boolean}
		 */
		canRecord() {
			return !this.busy && !this.detecting && !this.current.redactedDocumentRef
				&& this.passages.length > 0
				&& this.passages.every((p) => p.verdict !== null)
				&& this.toRedact.length > 0
		},

		/** @return {Array<{text: string, verdict: (string|null)}>} The text with the passages marked. */
		segments() {
			return redactionSegments(this.documentText, this.passages)
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,
		n,

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
		 * A configured url with the record and the open document filled in.
		 *
		 * @param {string} key The `urls` key.
		 * @return {string}
		 */
		urlOf(key) {
			const template = String((this.config.urls || {})[key] || '')
			return generateUrl(template
				.replace('{recordId}', encodeURIComponent(String(this.recordId)))
				.replace('{documentRef}', encodeURIComponent(String(this.current.documentRef || ''))))
		},

		/**
		 * What a passage type is called.
		 *
		 * @param {string} type The type.
		 * @return {string}
		 */
		labelOf(type) {
			const label = (this.config.typeLabels || {})[type]
			return label ? this.cnTranslate(String(label)) : String(type || '')
		},

		/**
		 * What a verdict is called.
		 *
		 * @param {string} verdict The verdict.
		 * @return {string}
		 */
		verdictLabel(verdict) {
			return ({ accept: t('nextcloud-vue', 'Agreed'), adjust: t('nextcloud-vue', 'Adjust'), skip: t('nextcloud-vue', 'Do not redact') })[verdict] || ''
		},

		/**
		 * Read the documents and open the first.
		 *
		 * @spec openspec/changes/redaction-editor/specs/redaction-editor/spec.md#requirement-a-reviewer-redacts-a-records-documents
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.loadError = ''
			try {
				const { data } = await axios.get(this.urlOf('list'))
				this.documents = Array.isArray(data && data.documents) ? data.documents : []
			} catch (failure) {
				this.documents = []
				this.loadError = sentenceOf(failure, t('nextcloud-vue', 'The documents could not be read.'))
			} finally {
				this.loading = false
			}
			if (this.documents.length > 0) {
				await this.open(Math.min(this.index, this.documents.length - 1))
			}
		},

		/**
		 * Open one document: its recorded redaction, or the passages detected in it.
		 *
		 * @spec openspec/changes/redaction-editor/specs/redaction-editor/spec.md#requirement-a-reviewer-redacts-a-records-documents
		 * @param {number} at The document's position.
		 * @return {Promise<void>}
		 */
		async open(at) {
			this.index = at
			this.error = ''
			this.notice = ''
			this.documentText = ''
			this.passages = []
			if (this.current.redactedDocumentRef) {
				this.passages = this.passagesOf((this.current.redaction && this.current.redaction.entities) || [], 'accept')
				return
			}
			this.detecting = true
			try {
				const { data } = await axios.post(this.urlOf('detect'))
				this.documentText = String((data && data.text) || '')
				this.passages = this.passagesOf((data && data.redaction && data.redaction.entities) || [], null)
			} catch (failure) {
				this.error = sentenceOf(failure, t('nextcloud-vue', 'The passages of this document could not be found. Upload a redacted version instead.'))
			} finally {
				this.detecting = false
			}
		},

		/**
		 * Passages from entities; a locked entity starts agreed.
		 *
		 * @param {Array<object>} entities The entities.
		 * @param {string|null} verdict The verdict the others start with.
		 * @return {Array<object>}
		 */
		passagesOf(entities, verdict) {
			return entities.map((entity) => ({
				entity,
				type: String((entity && entity.type) || ''),
				value: String((entity && entity.value) || ''),
				locked: Boolean(entity && entity.locked),
				verdict: entity && entity.locked ? 'accept' : verdict,
			}))
		},

		/**
		 * Give a passage a verdict.
		 *
		 * @param {number} at The passage.
		 * @param {string} verdict The verdict.
		 */
		setVerdict(at, verdict) {
			if (!this.passages[at].locked) {
				this.passages[at] = { ...this.passages[at], verdict }
			}
		},

		/**
		 * Change an adjusted passage's text.
		 *
		 * @param {number} at The passage.
		 * @param {string} value The text.
		 */
		adjust(at, value) {
			this.passages[at] = { ...this.passages[at], value: String(value ?? '') }
		},

		/**
		 * Give a hand-added passage its type.
		 *
		 * @param {number} at The passage.
		 * @param {{id: string}|null} option The type.
		 */
		retype(at, option) {
			const type = String((option && option.id) || 'UNKNOWN')
			const passage = this.passages[at]
			this.passages[at] = { ...passage, type, entity: { ...passage.entity, type } }
		},

		/** Add a passage the detection missed. */
		addPassage() {
			this.passages.push({ entity: { type: 'UNKNOWN', source: 'officer' }, type: 'UNKNOWN', value: '', locked: false, verdict: 'adjust' })
		},

		/**
		 * Record the reviewer's check of the passages, then ask for the redacted copy.
		 *
		 * @spec openspec/changes/redaction-editor/specs/redaction-editor/spec.md#requirement-a-reviewer-redacts-a-records-documents
		 * @return {Promise<void>}
		 */
		async record() {
			if (!this.canRecord) {
				return
			}
			this.busy = true
			this.error = ''
			this.notice = ''
			try {
				await axios.post(this.urlOf('check'), { entities: this.toRedact })
				const { data } = await axios.post(this.urlOf('redact'))
				this.recorded(data)
			} catch (failure) {
				this.error = sentenceOf(failure, t('nextcloud-vue', 'The redacted copy could not be made. Upload a redacted version instead.'))
			} finally {
				this.busy = false
			}
		},

		/**
		 * Upload a version redacted elsewhere.
		 *
		 * @param {FileList|null} files The chosen file.
		 * @return {Promise<void>}
		 */
		async upload(files) {
			const file = files && files[0]
			if (!file) {
				return
			}
			const form = new FormData()
			form.append('file', file)
			this.busy = true
			this.error = ''
			this.notice = ''
			try {
				const { data } = await axios.post(this.urlOf('upload'), form)
				this.recorded(data)
			} catch (failure) {
				this.error = sentenceOf(failure, t('nextcloud-vue', 'The redacted version could not be stored. Try again.'))
			} finally {
				this.busy = false
				if (this.$refs.upload) {
					this.$refs.upload.value = ''
				}
			}
		},

		/**
		 * Show the recorded copy and refresh the page.
		 *
		 * @param {object} data The server's answer.
		 */
		recorded(data) {
			this.documents[this.index] = { ...this.current, redactedDocumentRef: String((data && data.redactedDocumentRef) || ''), redaction: (data && data.redaction) || {} }
			this.notice = t('nextcloud-vue', 'The redacted copy is recorded. Only this copy will be published.')
			emit(PAGE_REFRESH, { reason: 'redaction' })
			/** @event recorded A redacted copy was recorded. Payload: `{ documentRef, redactedDocumentRef }`. */
			this.$emit('recorded', { documentRef: this.current.documentRef, redactedDocumentRef: this.current.redactedDocumentRef })
		},
	},
}
</script>

<style scoped>
.cn-redaction {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-redaction__head,
.cn-redaction__bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.cn-redaction__title {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
}

.cn-redaction__buttons,
.cn-redaction__verdicts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-redaction__muted {
	color: var(--color-text-maxcontrast);
}

.cn-redaction__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

.cn-redaction__columns {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 20px;
}

.cn-redaction__document,
.cn-redaction__proposal {
	display: flex;
	flex-direction: column;
	min-width: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
}

.cn-redaction__document {
	flex: 999 1 520px;
	gap: 12px;
	padding: 28px 32px;
}

.cn-redaction__proposal {
	flex: 1 1 300px;
	gap: 10px;
	padding: 20px 22px;
}

.cn-redaction__body {
	white-space: pre-wrap;
	line-height: 1.6;
}

.cn-redaction__mark--accept {
	background: var(--color-main-text);
	color: var(--color-main-text);
}

.cn-redaction__mark--adjust,
.cn-redaction__mark--open {
	outline: 2px solid var(--color-warning-text, var(--color-warning));
	background: var(--color-background-hover);
}

.cn-redaction__mark--skip {
	text-decoration: underline dotted;
}

.cn-redaction__list {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-redaction__passage {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-redaction__line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-redaction__pill {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 12px;
	background: var(--color-background-dark);
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}

.cn-redaction__pill--accept {
	color: var(--color-success-text, var(--color-success));
}

.cn-redaction__pill--adjust {
	color: var(--color-warning-text, var(--color-warning));
}
</style>
