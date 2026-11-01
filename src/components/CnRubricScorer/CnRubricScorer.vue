<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-rubric-scorer" data-testid="cn-rubric-scorer">
		<div v-if="loading" class="cn-rubric-scorer__loading">
			<NcLoadingIcon :size="20" />
		</div>

		<NcNoteCard v-else-if="loadError" type="error">
			{{ loadError }}
		</NcNoteCard>

		<p v-else-if="criteria.length === 0" class="cn-rubric-scorer__empty">
			{{ emptyLabel }}
		</p>

		<template v-else>
			<fieldset v-for="criterion in criteria"
				:key="criterion.criterionId"
				class="cn-rubric-scorer__criterion">
				<legend class="cn-rubric-scorer__legend">
					{{ criterion.label }}
					<span v-if="criterion.weight !== undefined && criterion.weight !== null" class="cn-rubric-scorer__weight">
						{{ weightLabel(criterion.weight) }}
					</span>
				</legend>
				<p v-if="criterion.description" class="cn-rubric-scorer__description">
					{{ criterion.description }}
				</p>
				<div class="cn-rubric-scorer__levels">
					<label v-for="level in criterion.levels"
						:key="level.levelId"
						class="cn-rubric-scorer__level"
						:class="{ 'cn-rubric-scorer__level--chosen': chosen[criterion.criterionId] === level.levelId }">
						<input type="radio"
							:name="groupName(criterion)"
							:value="level.levelId"
							:checked="chosen[criterion.criterionId] === level.levelId"
							:disabled="readOnly || busy"
							@change="choose(criterion, level)">
						<span class="cn-rubric-scorer__level-label">{{ level.label }}</span>
						<span class="cn-rubric-scorer__points">{{ pointsLabel(level.points) }}</span>
						<span v-if="level.description" class="cn-rubric-scorer__level-description">{{ level.description }}</span>
					</label>
				</div>
			</fieldset>

			<p class="cn-rubric-scorer__total" role="status">
				{{ totalLabel }}
			</p>

			<div v-if="note" class="cn-rubric-scorer__note">
				<label :for="noteId" class="cn-rubric-scorer__note-label">{{ note.label }}</label>
				<textarea :id="noteId"
					v-model="noteText"
					class="cn-rubric-scorer__note-input"
					rows="4"
					:disabled="readOnly || busy" />
			</div>

			<p v-if="!readOnly && submitAction && requireAll && missing > 0" class="cn-rubric-scorer__missing">
				{{ missingLabel }}
			</p>

			<div v-if="!readOnly" class="cn-rubric-scorer__actions">
				<NcButton variant="secondary"
					:disabled="busy"
					@click="save(false)">
					{{ saveLabel }}
				</NcButton>
				<NcButton v-if="submitAction"
					variant="primary"
					:disabled="busy || (requireAll && missing > 0)"
					@click="save(true)">
					{{ submitAction.label }}
				</NcButton>
			</div>

			<NcNoteCard v-if="notice" :type="noticeType">
				{{ notice }}
			</NcNoteCard>
		</template>
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { performTransition, transitionError } from '../../composables/useLifecycleTransitions.js'
import { conditionHolds } from '../../utils/fieldCondition.js'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/** Instances on the page, for unique radio group names. */
let instances = 0

/**
 * Unwrap a provided ref.
 *
 * @param {unknown} value A ref or a plain value.
 * @return {unknown} The value.
 */
function unwrap(value) {
	return value && typeof value === 'object' && 'value' in value ? value.value : value
}

/**
 * The OpenRegister objects URL of a schema, or of one object.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {string} [id] The object id.
 * @return {string} The URL.
 */
function objectsUrl(register, schema, id) {
	const base = `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}`
	return prefixUrl(id ? `${base}/${encodeURIComponent(id)}` : base)
}

/**
 * The object in a single-object response.
 *
 * @param {object} data The response body.
 * @return {object} The object.
 */
function oneObject(data) {
	return data && typeof data === 'object' && data.object && typeof data.object === 'object' ? data.object : (data || {})
}

/**
 * The id of an object.
 *
 * @param {object|null} object The object.
 * @return {string} The id, or ''.
 */
function idOf(object) {
	const id = object && (object.id || object.uuid || (object['@self'] && object['@self'].id))
	return id ? String(id) : ''
}

/**
 * CnRubricScorer — the `rubric-scorer` widget: scores a record against a
 * rubric's criteria and levels.
 *
 * Each criterion is a fieldset whose legend names it, with one radio per
 * level and its points; the total runs along. One save writes the scores,
 * the total and an optional note to the scored record in ONE request, and
 * `submitAction` runs a lifecycle transition after it. The scored record is
 * the page object, or with `createIfMissing` the first record of another
 * schema matching a filter, created on the first save.
 *
 * The server decides who may write: a refusal shows the server's words and
 * the choices stay.
 *
 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md
 */
export default {
	name: 'CnRubricScorer',

	components: { NcButton, NcLoadingIcon, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `rubric` (required) — `{ register, schema, id }` to read the rubric object (tokens resolve in `id`), or
		 *   `{ from }` to read it from a path of the page object. A rubric has
		 *   `criteria: [{ criterionId, label, weight?, description?, levels: [{ levelId, label, points, description? }] }]`.
		 * - `field` — where the scores are stored on the scored record (default `rubricScores`), as
		 *   `[{ criterionId, levelId, points }]`.
		 * - `totalField` — where the total points are stored; omitted stores none.
		 * - `note` — `{ field, label }`: a text the scorer writes along (feedback, a reflection).
		 * - `submitAction` — `{ transition, label }`: run after the save from its own button.
		 * - `requireAll` — the submit waits until every criterion is scored.
		 * - `readOnly`, or `readOnlyWhen` (a condition on the scored record, e.g. `{ field: 'lifecycle', in: ['returned'] }`).
		 * - `createIfMissing` — `{ register, schema, filter, values }`: score the first record of that schema matching
		 *   `filter`, or create one with `values` on the first save.
		 * - `saveLabel`, `emptyText`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The current detail-page object. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The current object id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['saved'],

	data() {
		instances++
		return {
			uid: `cn-rubric-${instances}`,
			loading: false,
			loadError: '',
			rubric: null,
			/** The scored record when it is not the page object; null = not found (yet). */
			other: null,
			chosen: {},
			noteText: '',
			busy: false,
			notice: '',
			noticeType: 'error',
		}
	},

	computed: {
		/** The token context: the page object and the workspace. */
		tokenCtx() {
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				objectId: this.objectId || injected.objectId || this.objectData?.id || null,
				object: this.objectData || injected.object || null,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/**
		 * The rubric's criteria, labels translated.
		 *
		 * @return {Array<object>}
		 */
		criteria() {
			const list = this.rubric && Array.isArray(this.rubric.criteria) ? this.rubric.criteria : []
			return list
				.filter((criterion) => criterion && criterion.criterionId && Array.isArray(criterion.levels))
				.map((criterion) => ({
					...criterion,
					levels: criterion.levels.filter((level) => level && level.levelId),
				}))
		},

		/** Whether another schema's record is scored. */
		scoresOther() {
			return Boolean(this.content.createIfMissing && this.content.createIfMissing.schema)
		},

		/** The scored record, or null when it does not exist yet. */
		target() {
			return this.scoresOther ? this.other : this.objectData
		},

		field() {
			return this.content.field || 'rubricScores'
		},

		note() {
			const note = this.content.note
			return note && note.field ? { field: note.field, label: this.tr(note.label || note.field) } : null
		},

		noteId() {
			return `${this.uid}-note`
		},

		submitAction() {
			const action = this.content.submitAction
			return action && action.transition ? { transition: action.transition, label: this.tr(action.label || action.transition) } : null
		},

		requireAll() {
			return this.content.requireAll === true
		},

		/**
		 * Whether scoring is closed: `readOnly`, or `readOnlyWhen` holds for the scored record.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md#requirement-a-rubric-scorer-is-read-only-when-scoring-has-closed
		 */
		readOnly() {
			if (this.content.readOnly === true) {
				return true
			}
			const when = this.content.readOnlyWhen
			return Boolean(when && this.target && conditionHolds(when, this.target, 'readOnlyWhen'))
		},

		/**
		 * The chosen levels as stored: one entry per scored criterion, in rubric order.
		 *
		 * @return {Array<{criterionId: string, levelId: string, points: number}>}
		 */
		scores() {
			const out = []
			for (const criterion of this.criteria) {
				const level = criterion.levels.find((l) => l.levelId === this.chosen[criterion.criterionId])
				if (level) {
					out.push({ criterionId: criterion.criterionId, levelId: level.levelId, points: Number(level.points) || 0 })
				}
			}
			return out
		},

		total() {
			return this.scores.reduce((sum, score) => sum + score.points, 0)
		},

		maximum() {
			return this.criteria.reduce((sum, criterion) => sum + Math.max(0, ...criterion.levels.map((l) => Number(l.points) || 0)), 0)
		},

		/** How many criteria have no level yet. */
		missing() {
			return this.criteria.length - this.scores.length
		},

		totalLabel() {
			return t('nextcloud-vue', 'Total: {score} of {max} points', { score: this.total, max: this.maximum })
		},

		missingLabel() {
			return n('nextcloud-vue', '%n criterion still to score', '%n criteria still to score', this.missing)
		},

		saveLabel() {
			return this.content.saveLabel ? this.tr(this.content.saveLabel) : t('nextcloud-vue', 'Save')
		},

		emptyLabel() {
			return this.content.emptyText ? this.tr(this.content.emptyText) : t('nextcloud-vue', 'There is no rubric to score against.')
		},
	},

	watch: {
		objectData() {
			this.load()
		},
	},

	created() {
		this.load()
	},

	methods: {
		/**
		 * Translate a configured string.
		 *
		 * @param {string} key The string.
		 * @return {string}
		 */
		tr(key) {
			return typeof key === 'string' && key !== '' ? this.cnTranslate(key) : (key || '')
		},

		async http() {
			const { default: axios } = await import('@nextcloud/axios')
			return axios
		},

		/**
		 * Resolve page tokens; null while a required token has no value.
		 *
		 * @param {unknown} value The configured value.
		 * @return {unknown}
		 */
		resolved(value) {
			const out = resolveDeepTokens(value ?? {}, this.tokenCtx)
			return hasUnresolvedDeepTokens(out) ? null : out
		},

		groupName(criterion) {
			return `${this.uid}-${criterion.criterionId}`
		},

		weightLabel(weight) {
			return t('nextcloud-vue', 'weight {weight}', { weight })
		},

		pointsLabel(points) {
			return n('nextcloud-vue', '%n point', '%n points', Number(points) || 0)
		},

		/**
		 * Read the rubric and the scored record, and preselect what is stored.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md#requirement-a-rubric-scorer-draws-one-fieldset-per-criterion
		 */
		async load() {
			const run = this.loadRun = (this.loadRun || 0) + 1
			this.loading = true
			this.loadError = ''
			try {
				const [rubric, other] = await Promise.all([this.readRubric(), this.readOther()])
				if (run !== this.loadRun) {
					return
				}
				this.rubric = rubric
				this.other = other
				this.preselect()
			} catch (e) {
				if (run === this.loadRun) {
					this.loadError = t('nextcloud-vue', 'The rubric could not be loaded: {reason}', { reason: serverErrorMessage(e) })
				}
			} finally {
				if (run === this.loadRun) {
					this.loading = false
				}
			}
		},

		/**
		 * The rubric: a path of the page object, or an object read by id.
		 *
		 * @return {Promise<object|null>}
		 */
		async readRubric() {
			const source = this.content.rubric || {}
			if (source.from) {
				const inline = readPath(this.objectData || {}, source.from)
				return inline && typeof inline === 'object' ? inline : null
			}
			const ref = this.resolved({ id: source.id })
			if (!source.register || !source.schema || ref === null || !ref.id) {
				return null
			}
			const axios = await this.http()
			const { data } = await axios.get(objectsUrl(source.register, source.schema, String(ref.id)))
			return oneObject(data)
		},

		/**
		 * The record of `createIfMissing` matching its filter, or null.
		 *
		 * @return {Promise<object|null>}
		 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md#requirement-a-rubric-scorer-can-score-a-record-it-creates
		 */
		async readOther() {
			if (!this.scoresOther) {
				return null
			}
			const spec = this.content.createIfMissing
			const filter = this.resolved(spec.filter || {})
			if (filter === null) {
				return null
			}
			const axios = await this.http()
			const { data } = await axios.get(objectsUrl(spec.register, spec.schema), { params: { ...filter, _limit: 1 } })
			const results = data && Array.isArray(data.results) ? data.results : []
			return results[0] || null
		},

		/** Take the stored scores and note from the scored record. */
		preselect() {
			const stored = this.target ? readPath(this.target, this.field) : null
			const chosen = {}
			for (const score of Array.isArray(stored) ? stored : []) {
				if (score && score.criterionId && score.levelId) {
					chosen[score.criterionId] = score.levelId
				}
			}
			this.chosen = chosen
			this.noteText = this.note && this.target ? String(readPath(this.target, this.note.field) ?? '') : ''
		},

		/**
		 * Choose a level for a criterion.
		 *
		 * @param {object} criterion The criterion.
		 * @param {object} level The level.
		 * @return {void}
		 */
		choose(criterion, level) {
			this.chosen = { ...this.chosen, [criterion.criterionId]: level.levelId }
		},

		/**
		 * What one save writes.
		 *
		 * @return {object}
		 */
		body() {
			const body = { [this.field]: this.scores }
			if (this.content.totalField) {
				body[this.content.totalField] = this.total
			}
			if (this.note) {
				body[this.note.field] = this.noteText
			}
			return body
		},

		/**
		 * Save the scores in one request, then run the submit transition when asked.
		 *
		 * @param {boolean} submit Whether to run `submitAction` after the save.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-rubric-scorer/specs/rubric-scorer/spec.md#requirement-a-rubric-scorer-saves-once-and-then-transitions
		 */
		async save(submit) {
			this.busy = true
			this.notice = ''
			let saved
			try {
				saved = await this.write()
			} catch (e) {
				this.notice = serverErrorMessage(e)
				this.noticeType = 'error'
				this.busy = false
				return
			}
			if (submit && this.submitAction && saved) {
				try {
					await performTransition(idOf(saved), this.submitAction.transition)
				} catch (e) {
					this.notice = transitionError(e, t('nextcloud-vue', 'The scores were saved, but the next step was refused.'))
					this.noticeType = 'error'
					this.busy = false
					this.$emit('saved')
					return
				}
			}
			this.notice = submit && this.submitAction ? t('nextcloud-vue', 'Saved and sent on.') : t('nextcloud-vue', 'Saved.')
			this.noticeType = 'success'
			this.busy = false
			this.$emit('saved')
		},

		/**
		 * Write the body to the scored record, creating it when it does not exist.
		 *
		 * @return {Promise<object|null>} The saved record.
		 */
		async write() {
			const axios = await this.http()
			if (this.scoresOther) {
				const spec = this.content.createIfMissing
				if (this.other) {
					const { data } = await axios.patch(objectsUrl(spec.register, spec.schema, idOf(this.other)), this.body())
					this.other = { ...this.other, ...this.body(), ...oneObject(data) }
					return this.other
				}
				const values = this.resolved(spec.values || {})
				if (values === null) {
					return null
				}
				const { data } = await axios.post(objectsUrl(spec.register, spec.schema), { ...values, ...this.body() })
				this.other = { ...values, ...this.body(), ...oneObject(data) }
				return this.other
			}
			const id = this.objectId || idOf(this.objectData)
			if (!id || typeof this.register !== 'string' || typeof this.schema !== 'string' || !this.register || !this.schema) {
				return null
			}
			const { data } = await axios.patch(objectsUrl(this.register, this.schema, String(id)), this.body())
			return { ...(this.objectData || {}), id: String(id), ...oneObject(data) }
		},
	},
}
</script>

<style scoped>
.cn-rubric-scorer {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-rubric-scorer__loading {
	display: flex;
	justify-content: center;
	padding: 16px;
}

.cn-rubric-scorer__criterion {
	margin: 0;
	padding: 8px 12px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
}

.cn-rubric-scorer__legend {
	padding: 0 4px;
	font-weight: 600;
}

.cn-rubric-scorer__weight,
.cn-rubric-scorer__points,
.cn-rubric-scorer__description,
.cn-rubric-scorer__level-description,
.cn-rubric-scorer__empty,
.cn-rubric-scorer__missing {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
}

.cn-rubric-scorer__description {
	margin: 0 0 8px;
}

.cn-rubric-scorer__levels {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 8px;
}

.cn-rubric-scorer__level {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 8px;
	padding: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
	cursor: pointer;
}

.cn-rubric-scorer__level--chosen {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-rubric-scorer__level-description {
	flex-basis: 100%;
	font-size: 0.9em;
}

.cn-rubric-scorer__total {
	margin: 0;
	font-weight: 600;
}

.cn-rubric-scorer__note {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-rubric-scorer__note-input {
	width: 100%;
	resize: vertical;
}

.cn-rubric-scorer__missing {
	margin: 0;
}

.cn-rubric-scorer__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
