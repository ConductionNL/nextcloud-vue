<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-checklist-run" data-testid="cn-checklist-run">
		<p v-if="error"
			class="cn-checklist-run__error"
			role="alert"
			data-testid="cn-checklist-run-error">
			{{ error }}
		</p>
		<div v-else-if="loading" class="cn-checklist-run__loading">
			<NcLoadingIcon :size="20" :name="loadingLabel" />
		</div>
		<p v-else-if="questions.length === 0" class="cn-checklist-run__empty" data-testid="cn-checklist-run-empty">
			{{ emptyLabel }}
		</p>
		<form v-else
			class="cn-checklist-run__form"
			novalidate
			@submit.prevent="next">
			<p
				ref="position"
				class="cn-checklist-run__position"
				tabindex="-1"
				data-testid="cn-checklist-run-position">
				{{ positionText }}
			</p>
			<span
				class="cn-checklist-run__progress"
				role="progressbar"
				:aria-label="progressLabel"
				aria-valuemin="0"
				:aria-valuemax="questions.length"
				:aria-valuenow="answeredCount"
				data-testid="cn-checklist-run-progress">
				<span class="cn-checklist-run__progress-fill" :style="{ width: `${progressShare}%` }" />
			</span>
			<span class="cn-checklist-run__live" aria-live="polite">{{ liveText }}</span>

			<p v-if="pageGroup" class="cn-checklist-run__group" data-testid="cn-checklist-run-group">
				{{ pageGroup }}
			</p>
			<fieldset
				v-for="question in pageQuestions"
				:key="question.id"
				class="cn-checklist-run__question"
				:aria-describedby="question.help ? `${uid}-help-${question.id}` : null"
				data-testid="cn-checklist-run-question">
				<legend class="cn-checklist-run__legend">
					{{ question.text }}<span v-if="question.required" class="cn-checklist-run__required">
						<span aria-hidden="true"> *</span><span class="cn-checklist-run__sr">{{ requiredLabel }}</span>
					</span>
				</legend>
				<p v-if="question.help" :id="`${uid}-help-${question.id}`" class="cn-checklist-run__help">
					{{ question.help }}
				</p>
				<template v-if="question.choices.length">
					<label
						v-for="choice in question.choices"
						:key="choice.value"
						class="cn-checklist-run__choice">
						<input
							v-model="draft[question.id].value"
							type="radio"
							:name="`${uid}-${question.id}`"
							:value="choice.value"
							:required="question.required"
							data-testid="cn-checklist-run-choice"
							@change="markDirty(question.id)">
						{{ choice.label }}
					</label>
				</template>
				<input
					v-else-if="question.kind === 'number'"
					v-model="draft[question.id].value"
					class="cn-checklist-run__number"
					type="number"
					inputmode="decimal"
					:aria-label="question.text"
					:required="question.required"
					data-testid="cn-checklist-run-number"
					@input="markDirty(question.id)">
				<p v-else-if="question.kind === 'photo'" class="cn-checklist-run__help">
					{{ photoOnlyLabel }}
				</p>
				<textarea
					v-else
					v-model="draft[question.id].value"
					class="cn-checklist-run__text"
					rows="3"
					:aria-label="question.text"
					:required="question.required"
					data-testid="cn-checklist-run-text"
					@input="markDirty(question.id)" />
				<label v-if="allowNote" class="cn-checklist-run__note-label">
					{{ noteLabel }}
					<textarea
						v-model="draft[question.id].note"
						class="cn-checklist-run__text"
						rows="2"
						data-testid="cn-checklist-run-note"
						@input="markDirty(question.id)" />
				</label>
				<p
					v-if="missing.includes(question.id)"
					class="cn-checklist-run__error"
					role="alert"
					data-testid="cn-checklist-run-missing">
					{{ missingLabel }}
				</p>
			</fieldset>

			<div
				v-for="question in photoQuestions"
				:key="`photos-${question.id}`"
				class="cn-checklist-run__photos"
				data-testid="cn-checklist-run-photos">
				<strong class="cn-checklist-run__photos-title">{{ photoTitle(question) }}</strong>
				<ul v-if="photoNamesFor(question).length" class="cn-checklist-run__photo-list">
					<li v-for="name in photoNamesFor(question)" :key="name" data-testid="cn-checklist-run-photo">
						{{ name }}
					</li>
				</ul>
				<label class="cn-checklist-run__photo-button">
					<input
						class="cn-checklist-run__photo-input"
						type="file"
						accept="image/*"
						capture="environment"
						:aria-describedby="missingPhoto.includes(question.id) ? `${uid}-photo-${question.id}` : null"
						data-testid="cn-checklist-run-photo-input"
						@change="addPhotos($event, question.id)">
					{{ photoNamesFor(question).length || (storedPhotos[question.id] || []).length ? morePhotoLabel : addPhotoLabel }}
				</label>
				<p
					v-if="missingPhoto.includes(question.id)"
					:id="`${uid}-photo-${question.id}`"
					class="cn-checklist-run__error"
					role="alert"
					data-testid="cn-checklist-run-missing-photo">
					{{ missingPhotoLabel }}
				</p>
			</div>

			<div class="cn-checklist-run__nav">
				<NcButton
					variant="secondary"
					:disabled="page === 0 || saving"
					data-testid="cn-checklist-run-previous"
					@click="previous">
					{{ previousLabel }}
				</NcButton>
				<NcButton
					variant="primary"
					type="submit"
					:disabled="saving"
					data-testid="cn-checklist-run-next">
					{{ isLastPage ? finishLabel : nextLabel }}
				</NcButton>
			</div>
			<p v-if="saveError"
				class="cn-checklist-run__error"
				role="alert"
				data-testid="cn-checklist-run-save-error">
				{{ saveError }}
			</p>
		</form>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { uploadHeldFiles } from '../../composables/useHeldFileUpload.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { fetchReferenceObjects } from '../../utils/boardReferenceColumns.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedTokens, resolveDeepTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

const OBJECT_API = '/apps/openregister/api/objects'

let instanceCounter = 0

/**
 * The choices a question type offers, before translation.
 *
 * @type {Record<string, Array<{value: string, label: string}>>}
 */
const TYPE_CHOICES = Object.freeze({
	yes_no: [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }],
	yes_no_na: [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }, { key: 'na', label: 'Not applicable' }],
})

/** The kinds of question the widget draws. */
const KINDS = Object.freeze(['yes_no', 'yes_no_na', 'choice', 'text', 'number', 'photo'])

/**
 * Sort by a numeric field, lowest first, keeping the given order for ties and
 * for entries without the field.
 *
 * @param {Array<object>} list The entries.
 * @param {string} field The field.
 * @return {Array<object>} A sorted copy.
 */
function byOrder(list, field) {
	if (!field) {
		return [...list]
	}
	const rank = (entry) => {
		const n = Number(readPath(entry, field))
		return Number.isFinite(n) ? n : Infinity
	}
	return list.map((entry, index) => ({ entry, index })).sort((a, b) => (rank(a.entry) - rank(b.entry)) || (a.index - b.index)).map(({ entry }) => entry)
}

/**
 * A register or schema as the object API path takes it.
 *
 * @param {string|object} value A slug, or a register/schema object.
 * @return {string} The slug or id.
 */
function slugOf(value) {
	if (value && typeof value === 'object') {
		return String(value.slug ?? value.id ?? '')
	}
	return value ? String(value) : ''
}

/**
 * The id of an object, wherever OpenRegister carries it.
 *
 * @param {object|null} object The object.
 * @return {string} The id, or ''.
 */
function idOf(object) {
	return String(object?.id ?? object?.['@self']?.id ?? object?.uuid ?? '')
}

/**
 * CnChecklistRunWidget — the `checklist-run` widget: a checklist answered a
 * page of questions at a time (board DqInspectie, the middle phone frame).
 *
 * The questions are records of a register, listed with a token-resolved
 * filter. Each page shows `pageSize` questions (one by default) as radio
 * choices or a text field, an optional note, and photos for the first
 * question of the page, then Previous and Next. The answers of a page are
 * saved when the user moves on.
 *
 * Answers are stored one record per question through the OpenRegister object
 * API, under the reader's own rights: an existing answer is updated, a new
 * one created with the `answers.create` fields. Photos go up through the
 * object's own file upload (`uploadHeldFiles`) and are attached to the
 * answer's `photosField`. An app that stores answers its own way names a
 * `saveAction` instead; it is dispatched per answer with the answer as its
 * last argument, and photos are not uploaded then.
 *
 * ```json
 * {
 *   "type": "checklist-run",
 *   "content": {
 *     "questions": { "register": "app", "schema": "question", "filter": { "checklist": "@object.checklist" }, "orderField": "position" },
 *     "fields": { "text": "text", "type": "type", "options": "options", "required": "required", "help": "help" },
 *     "answers": {
 *       "register": "app", "schema": "answer", "filter": { "run": "@objectId" },
 *       "questionField": "question", "valueField": "answer", "noteField": "note", "photosField": "photos",
 *       "create": { "run": "@objectId" }
 *     },
 *     "pageSize": 1,
 *     "caption": "{title} version {version}"
 *   }
 * }
 * ```
 *
 * The questions and answers can also live inside the open record:
 * `questionsPath` (with `itemsKey` for groups, both sorted by `orderField`)
 * reads the questions off it, and `answersPath` writes the answers into an
 * array on it, one entry per question keyed by `answerKey`, by updating the
 * record through the object API. Photos then go to the record's own files
 * (`recordPhotosField`) and their references into the answer.
 *
 * A question can require a photo: `fields.photoRequired` names its rule,
 * `photoRequiredValues` maps the stored values onto `never`, `always` or
 * `{ whenAnswer }`, and the page holds until the photo is there. On a page
 * with no bound record, `record: { register, schema, filter, sort }` picks
 * the open record: the first match, under the reader's rights.
 *
 * Question kinds: `yes_no`, `yes_no_na`, `choice` (the question's `options`,
 * a list of strings or `{ value, label }`), `number`, `photo` and `text`.
 * `typeMap` maps the app's type values onto them, `choiceValues` the stored
 * values of yes / no / not applicable.
 * Keyboard: the choices are native radio buttons in a fieldset whose legend is
 * the question; on a new page focus moves to the position line and a polite
 * live region reads it.
 */
export default {
	name: 'CnChecklistRunWidget',

	components: { NcButton, NcLoadingIcon },

	inject: {
		/** The detail page's object context (`{ objectId, object }`), for tokens. */
		cnObjectContext: { default: null },
		/** The page's workspace values, for `@workspace.<key>` tokens. */
		cnWorkspaceContext: { default: null },
		/** The host's translate, for manifest texts and question texts. */
		cnTranslate: { default: () => (key) => key },
		/** The page's pre-bound action dispatcher, for `saveAction` / `finishAction`. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The widget config: `{ questions | questionsPath, itemsKey?,
		 * groupLabelField?, orderField?, fields?, typeMap?, choiceValues?,
		 * answers | answersPath, answerKey?, answerFields?, recordPhotosField?,
		 * record?, saveAction?, finishAction?, pageSize?, allowNote?,
		 * allowPhotos?, caption?, emptyText? }`, as in the component
		 * description and docs/components/cn-checklist-run-widget.md.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record's id, for `@objectId`. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The bound record, for `@object.<field>`, the caption and `questionsPath` / `answersPath`. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The bound record's register, for writing `answersPath` (`content.record` wins). */
		register: {
			type: [String, Object],
			default: '',
		},

		/** The bound record's schema, for writing `answersPath` (`content.record` wins). */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['finished'],

	data() {
		instanceCounter += 1
		return {
			uid: `cn-checklist-run-${instanceCounter}`,
			loading: false,
			error: '',
			saving: false,
			saveError: '',
			questions: [],
			answerIds: {},
			// Photos an answer already holds, kept when new ones are attached.
			storedPhotos: {},
			// `answersPath` mode: the answer entries as last read or written.
			recordAnswers: [],
			draft: {},
			dirty: {},
			photos: {},
			page: 0,
			missing: [],
			// Questions on this page that still need their photo.
			missingPhoto: [],
			// `content.record` with a filter: the record it picked, or null.
			pickedRecord: null,
			liveText: '',
		}
	},

	computed: {
		/** @return {object} What the tokens resolve against. */
		tokenCtx() {
			const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				objectId: (this.pickedRecord && idOf(this.pickedRecord)) || this.objectId || injected.objectId || this.objectData?.id || null,
				object: this.pickedRecord || this.objectData || injected.object || null,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/** @return {object} The question field paths, with their defaults. */
		fields() {
			return { id: 'id', text: 'text', type: 'type', options: 'options', required: 'required', help: 'help', ...(this.content?.fields || {}) }
		},

		/** @return {number} Questions per page, at least 1. */
		pageSize() {
			const n = Math.floor(Number(this.content?.pageSize))
			return Number.isFinite(n) && n >= 1 ? n : 1
		},

		/** @return {number} The number of pages. */
		pageCount() {
			return Math.max(1, Math.ceil(this.questions.length / this.pageSize))
		},

		/** @return {boolean} Whether this is the last page. */
		isLastPage() {
			return this.page >= this.pageCount - 1
		},

		/** @return {object[]} The questions on this page. */
		pageQuestions() {
			return this.questions.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize)
		},

		/** @return {object|null} The first question on this page, the one photos belong to. */
		currentQuestion() {
			return this.pageQuestions[0] || null
		},

		/** @return {number} Questions with an answer. */
		answeredCount() {
			return this.questions.filter((q) => this.isAnswered(q)).length
		},

		/** @return {number} The share answered, 0 to 100. */
		progressShare() {
			return this.questions.length ? Math.round((this.answeredCount / this.questions.length) * 100) : 0
		},

		/** @return {string} "Question 7 of 24", with the caption after it. */
		positionText() {
			const first = this.page * this.pageSize + 1
			const position = t('nextcloud-vue', 'Question {n} of {total}', { n: first, total: this.questions.length })
			const caption = this.caption
			return caption ? `${position} · ${caption}` : position
		},

		/** @return {string} `content.caption` with `{field}` filled from the record. */
		caption() {
			const template = this.content?.caption
			if (typeof template !== 'string' || template === '') {
				return ''
			}
			const object = this.tokenCtx.object || {}
			return this.translate(template).replace(/\{([A-Za-z0-9_.]+)\}/g, (_m, path) => {
				const value = readPath(object, path)
				return value === null || value === undefined ? '' : String(value)
			}).trim()
		},

		/** @return {boolean} Whether a note field shows (default true). */
		allowNote() {
			return this.content?.allowNote !== false
		},

		/** @return {boolean} Whether the answers are written into an array on the open record. */
		inRecord() {
			return typeof this.content?.answersPath === 'string' && this.content.answersPath !== ''
		},

		/** @return {object} `answersPath` field names, with their defaults. */
		answerFields() {
			return { value: 'value', number: 'value', choice: 'value', note: 'note', photos: 'photos', ...(this.content?.answerFields || {}) }
		},

		/** @return {{register: string, schema: string}} Where the open record lives. */
		recordRef() {
			const own = this.content?.record || {}
			return { register: slugOf(own.register || this.register), schema: slugOf(own.schema || this.schema) }
		},

		/**
		 * Whether photos can be added: allowed, and somewhere to put them.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-questions-and-answers-can-live-inside-the-open-record
		 */
		photosEnabled() {
			if (this.content?.allowPhotos === false || this.content?.saveAction) {
				return false
			}
			if (this.inRecord) {
				return Boolean(this.content?.recordPhotosField && this.answerFields.photos)
			}
			return Boolean(this.content?.answers?.photosField)
		},

		/** @return {string} The group (section) of this page's first question, or ''. */
		pageGroup() {
			return this.currentQuestion?.group || ''
		},

		/**
		 * The questions of this page that get a photo control: with a
		 * `photoRequired` field, those whose rule is not never (and photo
		 * questions); without one, the first question of the page.
		 *
		 * @return {object[]} The questions.
		 * @spec openspec/changes/checklist-run-photo-rule/specs/checklist-run-photo-rule/spec.md#requirement-a-question-can-require-a-photo
		 */
		photoQuestions() {
			if (!this.photosEnabled) {
				return []
			}
			if (this.fields.photoRequired) {
				return this.pageQuestions.filter((q) => q.kind === 'photo' || q.photoRule !== 'never')
			}
			const first = this.currentQuestion
			const extra = this.pageQuestions.filter((q) => q.kind === 'photo' && q !== first)
			return first ? [first, ...extra] : extra
		},

		/**
		 * `content.record` with a `filter`: the list to pick the open record
		 * from (first match of `sort`), `'blocked'` while a token is
		 * unresolved, or null without a filter.
		 *
		 * @return {object|string|null}
		 * @spec openspec/changes/checklist-run-photo-rule/specs/checklist-run-photo-rule/spec.md#requirement-a-checklist-run-can-pick-its-record-by-filter
		 */
		recordPicker() {
			const own = this.content?.record
			if (!own || typeof own !== 'object' || !own.filter || typeof own.filter !== 'object') {
				return null
			}
			const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
			const filter = resolveFilterTokens(own.filter, { objectId: this.objectId || null, object: this.objectData, workspace: unwrap(this.cnWorkspaceContext) || {} })
			if (hasUnresolvedTokens(filter)) {
				return 'blocked'
			}
			const sort = own.sort && typeof own.sort === 'object' && own.sort.field ? { [`_order[${own.sort.field}]`]: own.sort.dir === 'asc' ? 'asc' : 'desc' } : {}
			return { register: slugOf(own.register), schema: slugOf(own.schema), filter: { ...filter, ...sort } }
		},

		/** @return {object|null} The record the run lives in: the picked one, else the bound one. */
		openRecord() {
			return this.recordPicker ? this.pickedRecord : this.tokenCtx.object
		},

		/** @return {string} The key of the source lists, to read them again when they change. */
		sourceKey() {
			const picker = this.recordPicker
			if (picker === 'blocked') {
				return ''
			}
			if (picker && typeof this.content?.questionsPath === 'string' && this.content.questionsPath !== '') {
				return JSON.stringify({ pick: picker, path: this.content.questionsPath })
			}
			if (typeof this.content?.questionsPath === 'string' && this.content.questionsPath !== '') {
				const object = this.tokenCtx.object
				return object ? JSON.stringify({ path: this.content.questionsPath, id: idOf(object), at: object['@self']?.updated ?? null }) : ''
			}
			const q = this.content?.questions
			if (!q || !q.register || !q.schema) {
				return ''
			}
			const qFilter = resolveFilterTokens(q.filter || {}, this.tokenCtx)
			const a = this.content?.answers
			const aFilter = a && a.register && a.schema ? resolveFilterTokens(a.filter || {}, this.tokenCtx) : null
			if (hasUnresolvedTokens(qFilter) || (aFilter && hasUnresolvedTokens(aFilter))) {
				return ''
			}
			return JSON.stringify({ q: [q.register, q.schema, qFilter], a: aFilter ? [a.register, a.schema, aFilter] : null })
		},

		loadingLabel: () => t('nextcloud-vue', 'Loading …'),
		progressLabel: () => t('nextcloud-vue', 'Questions answered'),
		requiredLabel: () => ` ${t('nextcloud-vue', '(required)')}`,
		missingLabel: () => t('nextcloud-vue', 'Answer this question to go on.'),
		previousLabel: () => t('nextcloud-vue', 'Previous'),
		nextLabel: () => t('nextcloud-vue', 'Next'),
		finishLabel: () => t('nextcloud-vue', 'Finish'),
		addPhotoLabel: () => t('nextcloud-vue', 'Take or add a photo'),
		missingPhotoLabel: () => t('nextcloud-vue', 'This answer needs a photo. Add one to go on.'),
		photoOnlyLabel: () => t('nextcloud-vue', 'Answer with a photo.'),
		morePhotoLabel: () => t('nextcloud-vue', 'Another photo'),

		/** @return {string} The note field's label. */
		noteLabel() {
			return this.content?.noteLabel ? this.translate(this.content.noteLabel) : t('nextcloud-vue', 'Note')
		},

		/** @return {string} The empty-state text. */
		emptyLabel() {
			return this.content?.emptyText ? this.translate(this.content.emptyText) : t('nextcloud-vue', 'This checklist has no questions.')
		},
	},

	watch: {
		sourceKey: {
			handler() {
				this.load()
			},

			immediate: true,
		},
	},

	methods: {
		/**
		 * The host's translate, or the text unchanged.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation.
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Whether a value counts as an answer.
		 *
		 * @param {unknown} value The value.
		 * @return {boolean} True for a non-empty value.
		 */
		hasValue(value) {
			return value !== null && value !== undefined && String(value).trim() !== ''
		},

		/**
		 * Whether a question has an answer: a value, or for a photo question
		 * a photo stored or held.
		 *
		 * @param {object} question The question.
		 * @return {boolean} True when answered.
		 */
		isAnswered(question) {
			if (question.kind === 'photo') {
				return this.hasPhoto(question)
			}
			return this.hasValue(this.draft[question.id]?.value)
		},

		/**
		 * A question record as the widget draws it.
		 *
		 * @param {object} record The question record.
		 * @param {string} [group] The group (section) it belongs to.
		 * @return {{id: string, text: string, kind: string, required: boolean, help: string, choices: Array<{value: string, label: string}>, group: string}} The question.
		 */
		toQuestion(record, group = '') {
			const f = this.fields
			const raw = String(readPath(record, f.type) ?? '')
			const mapped = this.content?.typeMap && typeof this.content.typeMap === 'object' ? this.content.typeMap[raw] : undefined
			const kind = KINDS.includes(mapped) ? mapped : (KINDS.includes(raw) ? raw : 'text')
			const stored = { yes: 'yes', no: 'no', na: 'na', ...(this.content?.choiceValues || {}) }
			let choices = (TYPE_CHOICES[kind] || []).map((c) => ({ value: String(stored[c.key]), label: t('nextcloud-vue', c.label) }))
			if (kind === 'choice') {
				const options = readPath(record, f.options)
				choices = (Array.isArray(options) ? options : []).map((o) => (o && typeof o === 'object'
					? { value: String(o.value ?? o.label ?? ''), label: this.translate(String(o.label ?? o.value ?? '')) }
					: { value: String(o), label: this.translate(String(o)) })).filter((c) => c.value !== '')
			}
			const help = readPath(record, f.help)
			return {
				id: String(readPath(record, f.id) ?? idOf(record)),
				text: this.translate(String(readPath(record, f.text) ?? '')),
				kind,
				required: Boolean(readPath(record, f.required)),
				help: typeof help === 'string' && help !== '' ? this.translate(help) : '',
				choices,
				group,
				photoRule: this.photoRuleOf(record),
			}
		},

		/**
		 * A question's photo rule, from its `photoRequired` field mapped
		 * through `photoRequiredValues`: `'never'`, `'always'` or
		 * `{ whenAnswer }` (a photo is needed when the answer is that value).
		 *
		 * @param {object} record The question record.
		 * @return {('never'|'always'|{whenAnswer: string})} The rule.
		 * @spec openspec/changes/checklist-run-photo-rule/specs/checklist-run-photo-rule/spec.md#requirement-a-question-can-require-a-photo
		 */
		photoRuleOf(record) {
			const path = this.fields.photoRequired
			if (!path) {
				return 'never'
			}
			const raw = readPath(record, path)
			const map = { true: 'always', false: 'never', always: 'always', never: 'never', ...(this.content?.photoRequiredValues || {}) }
			const rule = raw === null || raw === undefined ? 'never' : map[String(raw)]
			if (rule && typeof rule === 'object' && rule.whenAnswer !== undefined) {
				return { whenAnswer: String(rule.whenAnswer) }
			}
			return rule === 'always' ? 'always' : 'never'
		},

		/**
		 * Whether a question needs a photo with its current answer.
		 *
		 * @param {object} question The question.
		 * @return {boolean} True when a photo is required now.
		 */
		needsPhoto(question) {
			const rule = question.photoRule
			if (rule === 'always') {
				return true
			}
			return Boolean(rule && typeof rule === 'object' && String(this.draft[question.id]?.value ?? '') === rule.whenAnswer)
		},

		/**
		 * Whether a question has a photo, stored or held.
		 *
		 * @param {object} question The question.
		 * @return {boolean} True with at least one photo.
		 */
		hasPhoto(question) {
			return (this.storedPhotos[question.id] || []).length > 0 || (this.photos[question.id] || []).length > 0
		},

		/**
		 * The photo card title for a question: its position in the run.
		 *
		 * @param {object} question The question.
		 * @return {string} The title.
		 */
		photoTitle(question) {
			const n = this.questions.indexOf(question) + 1
			return t('nextcloud-vue', 'Photo for question {n}', { n })
		},

		/**
		 * The names of the photos held for a question.
		 *
		 * @param {object} question The question.
		 * @return {string[]} The file names.
		 */
		photoNamesFor(question) {
			return (this.photos[question.id] || []).map((file) => file.name)
		},

		/**
		 * The questions on the open record (`questionsPath`): a list of
		 * questions, or of groups whose `itemsKey` holds them, both levels
		 * sorted by `orderField`.
		 *
		 * @return {object[]} The questions.
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-questions-and-answers-can-live-inside-the-open-record
		 */
		questionsFromRecord() {
			const c = this.content
			const list = readPath(this.openRecord, c.questionsPath)
			const orderField = c.orderField === undefined ? 'order' : c.orderField
			const top = byOrder(Array.isArray(list) ? list : [], orderField)
			if (!c.itemsKey) {
				return top.map((record) => this.toQuestion(record))
			}
			const labelField = c.groupLabelField || 'name'
			return top.flatMap((group) => {
				const items = readPath(group, c.itemsKey)
				const label = readPath(group, labelField)
				return byOrder(Array.isArray(items) ? items : [], orderField).map((record) => this.toQuestion(record, typeof label === 'string' ? this.translate(label) : ''))
			})
		},

		/**
		 * The draft of one answer entry from the open record's `answersPath`.
		 *
		 * @param {object} question The question.
		 * @param {object} entry The stored entry.
		 * @return {{value: string, note: string}} The draft.
		 */
		draftFromEntry(question, entry) {
			const af = this.answerFields
			const field = question.kind === 'number' ? af.number : (question.kind === 'choice' ? af.choice : af.value)
			const value = readPath(entry, field)
			const note = readPath(entry, af.note)
			return { value: value === null || value === undefined ? '' : String(value), note: note === null || note === undefined ? '' : String(note) }
		},

		/**
		 * Read the questions and the answers given so far.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-a-checklist-run-shows-a-page-of-questions-at-a-time
		 */
		async load() {
			const key = this.sourceKey
			if (key === '') {
				return
			}
			this.loading = true
			this.error = ''
			try {
				const picker = this.recordPicker
				if (picker) {
					const found = await fetchReferenceObjects({ register: picker.register, schema: picker.schema, filter: picker.filter, limit: 1 })
					if (key !== this.sourceKey) {
						return
					}
					this.pickedRecord = found[0] || null
				}
				let questions
				if (picker && !this.pickedRecord) {
					questions = []
				} else if (this.content.questionsPath) {
					questions = this.questionsFromRecord()
				} else {
					const q = this.content.questions
					const records = await fetchReferenceObjects({ register: q.register, schema: q.schema, filter: resolveFilterTokens(q.filter || {}, this.tokenCtx), limit: q.limit || 500 })
					questions = byOrder(records, q.orderField).map((r) => this.toQuestion(r))
				}
				questions = questions.filter((x) => x.id !== '' && x.text !== '')
				const a = this.inRecord ? null : this.content.answers
				const answers = a && a.register && a.schema
					? await fetchReferenceObjects({ register: a.register, schema: a.schema, filter: resolveFilterTokens(a.filter || {}, this.tokenCtx), limit: a.limit || 500 })
					: []
				if (key !== this.sourceKey) {
					return
				}
				const draft = {}
				const answerIds = {}
				const storedPhotos = {}
				for (const question of questions) {
					draft[question.id] = { value: '', note: '' }
				}
				if (this.inRecord) {
					const entries = readPath(this.openRecord, this.content.answersPath)
					this.recordAnswers = Array.isArray(entries) ? entries : []
					const key = this.content.answerKey || 'questionId'
					for (const entry of this.recordAnswers) {
						const qid = String(readPath(entry, key) ?? '')
						const question = questions.find((x) => x.id === qid)
						if (question && !answerIds[qid]) {
							draft[qid] = this.draftFromEntry(question, entry)
							answerIds[qid] = qid
							const photos = readPath(entry, this.answerFields.photos)
							storedPhotos[qid] = Array.isArray(photos) ? photos : []
						}
					}
				}
				for (const answer of answers) {
					const qid = String(readPath(answer, a.questionField || 'question') ?? '')
					if (draft[qid] && !answerIds[qid]) {
						draft[qid] = {
							value: String(readPath(answer, a.valueField || 'answer') ?? ''),
							note: String(readPath(answer, a.noteField || 'note') ?? ''),
						}
						answerIds[qid] = idOf(answer)
						const stored = a.photosField ? readPath(answer, a.photosField) : null
						storedPhotos[qid] = Array.isArray(stored) ? stored : []
					}
				}
				this.questions = questions
				this.draft = draft
				this.answerIds = answerIds
				this.storedPhotos = storedPhotos
				this.dirty = {}
				this.page = Math.min(this.page, Math.max(0, Math.ceil(questions.length / this.pageSize) - 1))
			} catch {
				this.error = t('nextcloud-vue', 'The checklist could not be loaded.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Note that a question's answer changed, so the page saves it.
		 *
		 * @param {string} id The question id.
		 * @return {void}
		 */
		markDirty(id) {
			this.dirty = { ...this.dirty, [id]: true }
			this.missing = this.missing.filter((m) => m !== id)
		},

		/**
		 * Hold the photos picked for a question until the page saves.
		 *
		 * @param {Event} event The file input's change event.
		 * @param {string} [questionId] The question, else the first of the page.
		 * @return {void}
		 */
		addPhotos(event, questionId) {
			const id = questionId || this.currentQuestion?.id
			const files = Array.from(event?.target?.files || [])
			if (!id || files.length === 0) {
				return
			}
			this.photos = { ...this.photos, [id]: [...(this.photos[id] || []), ...files] }
			this.dirty = { ...this.dirty, [id]: true }
			this.missingPhoto = this.missingPhoto.filter((m) => m !== id)
			if (event.target) {
				event.target.value = ''
			}
		},

		/**
		 * Save the changed answers of this page: through `saveAction` when
		 * set, else one answer record per question through the object API,
		 * then its held photos.
		 *
		 * @return {Promise<boolean>} True when everything saved.
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-answers-are-saved-under-the-readers-own-rights
		 */
		async savePage() {
			const changed = this.pageQuestions.filter((q) => this.dirty[q.id])
			if (changed.length === 0) {
				return true
			}
			this.saving = true
			this.saveError = ''
			try {
				if (this.inRecord && !this.content?.saveAction) {
					await this.saveIntoRecord(changed)
					this.dirty = Object.fromEntries(Object.entries(this.dirty).filter(([id]) => !changed.some((q) => q.id === id)))
					return true
				}
				for (const question of changed) {
					await this.saveAnswer(question)
					const { [question.id]: _done, ...rest } = this.dirty
					this.dirty = rest
				}
				return true
			} catch {
				this.saveError = t('nextcloud-vue', 'The answer could not be saved. Try again.')
				return false
			} finally {
				this.saving = false
			}
		},

		/**
		 * Write the changed answers of this page into the open record's
		 * `answersPath` array (one entry per question, keyed by `answerKey`)
		 * with one update of the record through the object API. Held photos
		 * go first to the record's own files (`recordPhotosField`), and their
		 * references (`photoRefField`, default `id`) into the answer.
		 *
		 * @param {object[]} changed The changed questions.
		 * @return {Promise<void>}
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-questions-and-answers-can-live-inside-the-open-record
		 */
		async saveIntoRecord(changed) {
			const { register, schema } = this.recordRef
			const objectId = idOf(this.openRecord) || String(this.openRecordId || '')
			if (!register || !schema || !objectId) {
				throw new Error('no record to write to')
			}
			const c = this.content
			const af = this.answerFields
			const key = c.answerKey || 'questionId'
			const refField = c.photoRefField || 'id'
			let recordPhotos = Array.isArray(readPath(this.openRecord, c.recordPhotosField)) ? readPath(this.openRecord, c.recordPhotosField) : []
			const entries = [...this.recordAnswers]
			for (const question of changed) {
				const draft = this.draft[question.id]
				const index = entries.findIndex((entry) => String(readPath(entry, key) ?? '') === question.id)
				const entry = { ...(index >= 0 ? entries[index] : { [key]: question.id }) }
				if (question.kind === 'number') {
					entry[af.number] = draft.value === '' ? null : Number(draft.value)
				} else if (question.kind === 'choice') {
					entry[af.choice] = draft.value
				} else if (question.kind !== 'photo') {
					entry[af.value] = draft.value
				}
				if (this.allowNote) {
					entry[af.note] = draft.note
				}
				if (af.at) {
					entry[af.at] = new Date().toISOString()
				}
				const held = this.photos[question.id] || []
				if (this.photosEnabled && held.length) {
					const field = c.recordPhotosField
					const { failed, attached } = await uploadHeldFiles({ register, schema, objectId, held: { [field]: held }, kept: { [field]: recordPhotos } })
					if (failed.length) {
						throw new Error('photo upload failed')
					}
					const now = Array.isArray(attached[field]) ? attached[field] : recordPhotos
					const added = now.slice(recordPhotos.length).map((ref) => (ref && typeof ref === 'object' ? ref[refField] ?? ref : ref))
					recordPhotos = now
					const existing = Array.isArray(entry[af.photos]) ? entry[af.photos] : []
					entry[af.photos] = [...existing, ...added]
					this.storedPhotos = { ...this.storedPhotos, [question.id]: entry[af.photos] }
					const { [question.id]: _sent, ...rest } = this.photos
					this.photos = rest
				}
				if (index >= 0) {
					entries[index] = entry
				} else {
					entries.push(entry)
				}
			}
			const url = generateUrl(`${OBJECT_API}/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(objectId)}`)
			await axios.patch(url, { [c.answersPath]: entries })
			this.recordAnswers = entries
		},

		/**
		 * Save one answer.
		 *
		 * @param {object} question The question.
		 * @return {Promise<void>}
		 */
		async saveAnswer(question) {
			const entry = this.draft[question.id]
			const answer = { questionId: question.id, value: entry.value, note: entry.note }
			const action = this.content?.saveAction
			if (action && typeof action === 'object') {
				const resolved = resolveDeepTokens(action, this.tokenCtx)
				const wrapped = { ...resolved, args: [...(Array.isArray(resolved.args) ? resolved.args : []), answer] }
				const run = typeof this.cnDispatchAction === 'function' ? this.cnDispatchAction(wrapped) : dispatchAction(wrapped, { router: this.$router || null, tokenCtx: this.tokenCtx })
				await run
				return
			}
			const a = this.content?.answers
			if (!a || !a.register || !a.schema) {
				return
			}
			const body = {
				[a.questionField || 'question']: question.id,
				[a.valueField || 'answer']: entry.value,
			}
			if (this.allowNote) {
				body[a.noteField || 'note'] = entry.note
			}
			const base = generateUrl(`${OBJECT_API}/${encodeURIComponent(a.register)}/${encodeURIComponent(a.schema)}`)
			let id = this.answerIds[question.id]
			if (id) {
				await axios.patch(`${base}/${encodeURIComponent(id)}`, body)
			} else {
				const create = resolveDeepTokens(a.create && typeof a.create === 'object' ? a.create : {}, this.tokenCtx)
				const response = await axios.post(base, { ...create, ...body })
				id = idOf(response?.data)
				this.answerIds = { ...this.answerIds, [question.id]: id }
			}
			const held = this.photos[question.id] || []
			if (this.photosEnabled && held.length && id) {
				const { failed, attached } = await uploadHeldFiles({ register: a.register, schema: a.schema, objectId: id, held: { [a.photosField]: held }, kept: { [a.photosField]: this.storedPhotos[question.id] || [] } })
				if (failed.length) {
					throw new Error('photo upload failed')
				}
				if (Array.isArray(attached[a.photosField])) {
					this.storedPhotos = { ...this.storedPhotos, [question.id]: attached[a.photosField] }
				}
				const { [question.id]: _sent, ...rest } = this.photos
				this.photos = rest
			}
		},

		/**
		 * The required questions on this page without an answer.
		 *
		 * @return {string[]} Their ids.
		 */
		unansweredRequired() {
			return this.pageQuestions.filter((q) => q.required && !this.isAnswered(q)).map((q) => q.id)
		},

		/**
		 * Save this page and go to the next one; on the last page, finish.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-a-checklist-run-shows-a-page-of-questions-at-a-time
		 */
		async next() {
			this.missing = this.unansweredRequired()
			this.missingPhoto = this.photosEnabled ? this.pageQuestions.filter((q) => this.needsPhoto(q) && !this.hasPhoto(q)).map((q) => q.id) : []
			if (this.missing.length || this.missingPhoto.length) {
				return
			}
			if (!(await this.savePage())) {
				return
			}
			if (this.isLastPage) {
				await this.finish()
				return
			}
			this.goTo(this.page + 1)
		},

		/**
		 * Save this page and go back one.
		 *
		 * @return {Promise<void>}
		 */
		async previous() {
			if (this.page === 0 || !(await this.savePage())) {
				return
			}
			this.missing = []
			this.missingPhoto = []
			this.goTo(this.page - 1)
		},

		/**
		 * Show a page, move focus to its position line and announce it.
		 *
		 * @param {number} page The page.
		 * @return {void}
		 */
		goTo(page) {
			this.page = page
			this.$nextTick(() => {
				this.liveText = this.positionText
				this.$refs.position?.focus?.()
			})
		},

		/**
		 * The run is done: dispatch `finishAction` when set, and emit `finished`.
		 *
		 * @return {Promise<void>}
		 */
		async finish() {
			const action = this.content?.finishAction
			if (action && typeof action === 'object') {
				const resolved = resolveDeepTokens(action, this.tokenCtx)
				const run = typeof this.cnDispatchAction === 'function' ? this.cnDispatchAction(resolved) : dispatchAction(resolved, { router: this.$router || null, tokenCtx: this.tokenCtx })
				await run
			}
			this.liveText = t('nextcloud-vue', 'Checklist finished.')
			/**
			 * @event finished The last page was saved.
			 * @type {{answered: number, total: number}}
			 */
			this.$emit('finished', { answered: this.answeredCount, total: this.questions.length })
		},
	},
}
</script>

<style scoped>
.cn-checklist-run__form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-checklist-run__position {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-checklist-run__progress {
	background: var(--color-border);
	border-radius: 3px;
	display: block;
	height: 6px;
	overflow: hidden;
}

.cn-checklist-run__progress-fill {
	background: var(--color-primary-element);
	display: block;
	height: 100%;
}

.cn-checklist-run__live,
.cn-checklist-run__sr {
	clip-path: inset(50%);
	height: 1px;
	overflow: hidden;
	position: absolute;
	white-space: nowrap;
	width: 1px;
}

.cn-checklist-run__question,
.cn-checklist-run__photos {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 12px 14px;
}

.cn-checklist-run__legend {
	font-weight: 600;
	padding: 0 4px;
}

.cn-checklist-run__help {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-checklist-run__choice {
	align-items: center;
	display: flex;
	gap: 10px;
	min-height: 34px;
}

.cn-checklist-run__choice input {
	accent-color: var(--color-primary-element);
	height: 20px;
	margin: 0;
	width: 20px;
}

.cn-checklist-run__text,
.cn-checklist-run__number {
	box-sizing: border-box;
	width: 100%;
}

.cn-checklist-run__group {
	font-weight: 600;
	margin: 0;
}

.cn-checklist-run__note-label {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-checklist-run__photo-list {
	margin: 0;
	padding-inline-start: 18px;
}

.cn-checklist-run__photo-button {
	align-items: center;
	align-self: flex-start;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-element, 8px);
	cursor: pointer;
	display: inline-flex;
	font-weight: 600;
	min-height: 34px;
	padding: 0 14px;
}

.cn-checklist-run__photo-button:focus-within {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-checklist-run__photo-input {
	clip-path: inset(50%);
	height: 1px;
	overflow: hidden;
	position: absolute;
	width: 1px;
}

.cn-checklist-run__nav {
	display: flex;
	justify-content: space-between;
}

.cn-checklist-run__error {
	color: var(--color-error-text, var(--color-error));
	margin: 0;
}

.cn-checklist-run__empty {
	color: var(--color-text-maxcontrast);
}
</style>
