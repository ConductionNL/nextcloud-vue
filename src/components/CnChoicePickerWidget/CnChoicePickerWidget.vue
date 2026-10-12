<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-choice-picker" data-testid="cn-choice-picker">
		<p v-if="loading" class="cn-choice-picker__note" data-testid="cn-choice-picker-loading">
			{{ tr('Loading') }}
		</p>
		<p v-else-if="options.length === 0" class="cn-choice-picker__note" data-testid="cn-choice-picker-empty">
			{{ emptyLabel }}
		</p>
		<fieldset v-else class="cn-choice-picker__cards">
			<legend class="cn-choice-picker__legend">
				{{ legend }}
			</legend>
			<label
				v-for="option in options"
				:key="option.key"
				class="cn-choice-picker__card"
				:class="{
					'cn-choice-picker__card--selected': chosen === option.key,
					'cn-choice-picker__card--refused': option.refusal !== '',
				}"
				:data-testid="`cn-choice-picker-option-${option.key}`">
				<input
					class="cn-choice-picker__input"
					type="radio"
					:name="groupName"
					:value="option.key"
					:checked="chosen === option.key"
					:disabled="option.refusal !== '' || saving"
					@change="choose(option)">
				<span class="cn-choice-picker__swatches" aria-hidden="true">
					<span
						v-for="(colour, index) in option.swatches"
						:key="index"
						class="cn-choice-picker__swatch"
						:style="{ background: colour }" />
				</span>
				<span class="cn-choice-picker__text">
					<strong class="cn-choice-picker__title">{{ option.title }}</strong>
					<span v-if="option.refusal" class="cn-choice-picker__refusal" :data-testid="`cn-choice-picker-refusal-${option.key}`">
						{{ option.refusal }}
					</span>
				</span>
				<CnStatusBadge
					v-if="option.pill"
					:label="option.pill.label"
					:variant="option.pill.variant"
					size="small" />
			</label>
		</fieldset>

		<NcNoteCard v-if="selected && selected.warning.length > 0" type="warning" data-testid="cn-choice-picker-warning">
			<p v-if="warningIntro" class="cn-choice-picker__warning-intro">
				{{ warningIntro }}
			</p>
			<ul class="cn-choice-picker__warning-list">
				<li v-for="(line, index) in selected.warning" :key="index">
					{{ line }}
				</li>
			</ul>
		</NcNoteCard>

		<NcNoteCard v-if="notice" :type="noticeType" data-testid="cn-choice-picker-notice">
			{{ notice }}
		</NcNoteCard>

		<div v-if="options.length > 0 && !readOnly" class="cn-choice-picker__actions">
			<NcButton
				variant="primary"
				:disabled="saving || !canSave"
				data-testid="cn-choice-picker-save"
				@click="save(false)">
				{{ saveLabel }}
			</NcButton>
			<NcButton
				v-if="selected && selected.warning.length > 0"
				variant="secondary"
				:disabled="saving"
				data-testid="cn-choice-picker-confirm"
				@click="save(true)">
				{{ confirmLabel }}
			</NcButton>
		</div>
		<p v-if="hint" class="cn-choice-picker__hint">
			{{ hint }}
		</p>
	</div>
</template>

<script>
import { NcButton, NcNoteCard } from '@nextcloud/vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { prefixUrl } from '../../utils/headers.js'
import { objectUrlOf } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let uid = 0

/**
 * CnChoicePickerWidget — the `choice-picker` widget: choice cards read from a
 * source (or a static list), each with a radio, colour swatches read from the
 * item, a title and a state pill (a verdict such as "Leesbaar" / "Slecht
 * leesbaar"), bound to one field of the CURRENT object.
 *
 * Save is a button. A card that carries a warning (a list of lines read from
 * the item) shows them in a warning band under the cards and adds a second
 * button, the confirm action, so a risky choice is saved only on purpose: the
 * request tells the server which one was pressed (`@confirmed`). A card the
 * source marks as refused is listed with its reason and cannot be chosen.
 *
 * @spec openspec/changes/abstract-choice-picker/specs/choice-picker/spec.md
 */
export default {
	name: 'CnChoicePickerWidget',

	components: { CnStatusBadge, NcButton, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `field` (required) — the top-level field of the object holding the chosen key.
		 * - `source` — `{ url, path?, key, label, swatches?, state?, refusal?, warning? }` (tokens `@objectId`, `@object.<field>` in the url), or `items` — the same item shape as a static list.
		 *   - `swatches` — path to an array of colours (CSS colour strings).
		 *   - `state` — `{ path, map?, variantMap?, empty?, emptyVariant? }`: the pill; `map` turns the value into text, `variantMap` into a badge variant, `empty` is the text when the value is missing.
		 *   - `refusal` — path to a string: the card is listed with it and cannot be chosen.
		 *   - `warning` — `{ list, item? }`: `list` is a path to an array; `item` a template with `{path}` placeholders for object items (strings are used as they are).
		 * - `legend`, `warningIntro`, `saveLabel`, `confirmLabel`, `emptyText`, `hint`, `readOnly`.
		 * - `save` — `{ method?, url?, payload? }`: a custom request (tokens `@value`, `@confirmed`, `@objectId`, `@object.<field>`); without it the field is PATCHed on the object.
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
		uid += 1
		return {
			groupName: `cn-choice-picker-${uid}`,
			sourced: [],
			loading: false,
			saved: '',
			chosen: '',
			saving: false,
			notice: '',
			noticeType: 'success',
		}
	},

	computed: {
		spec() {
			return this.content.source || {}
		},

		/** The cards, from the static items then the source. */
		options() {
			const items = [...(Array.isArray(this.content.items) ? this.content.items : []), ...this.sourced]
			return items
				.filter((item) => item && readPath(item, this.spec.key || 'key') !== undefined)
				.map((item) => {
					const key = String(readPath(item, this.spec.key || 'key'))
					const refusal = this.spec.refusal ? readPath(item, this.spec.refusal) : ''
					return {
						key,
						title: String(readPath(item, this.spec.label || 'label') ?? key),
						swatches: this.listOf(item, this.spec.swatches).filter((colour) => typeof colour === 'string'),
						pill: this.pillOf(item),
						refusal: typeof refusal === 'string' ? refusal : '',
						warning: this.warningOf(item),
					}
				})
		},

		selected() {
			return this.options.find((option) => option.key === this.chosen) || null
		},

		canSave() {
			return this.chosen !== '' && this.chosen !== this.saved && (this.selected ? this.selected.refusal === '' : false)
		},

		legend() {
			return this.tr(this.content.legend || 'Choose one')
		},

		warningIntro() {
			return this.tr(this.content.warningIntro || '')
		},

		saveLabel() {
			return this.tr(this.content.saveLabel || 'Save')
		},

		confirmLabel() {
			return this.tr(this.content.confirmLabel || 'Use it anyway')
		},

		emptyLabel() {
			return this.tr(this.content.emptyText || 'Nothing to choose from')
		},

		hint() {
			return this.tr(this.content.hint || '')
		},

		readOnly() {
			return this.content.readOnly === true
		},

		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.adopt()
			this.loadSource()
		},
	},

	created() {
		this.adopt()
		this.loadSource()
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/** Read the current choice off the object. */
		adopt() {
			const stored = readPath(this.objectData || {}, this.content.field)
			this.saved = stored === undefined || stored === null ? '' : String(stored)
			this.chosen = this.saved
		},

		/**
		 * A list off an item.
		 *
		 * @param {object} item The item.
		 * @param {string} path The path, or undefined.
		 * @return {Array}
		 */
		listOf(item, path) {
			const list = path ? readPath(item, path) : []
			return Array.isArray(list) ? list : []
		},

		/**
		 * The state pill of an item.
		 *
		 * @param {object} item The item.
		 * @return {{label: string, variant: string}|null}
		 */
		pillOf(item) {
			const state = this.spec.state
			if (!state || !state.path) {
				return null
			}
			const raw = readPath(item, state.path)
			const empty = raw === undefined || raw === null || raw === ''
			if (empty) {
				return state.empty ? { label: this.tr(state.empty), variant: isBadgeVariant(state.emptyVariant) ? state.emptyVariant : 'default' } : null
			}
			const label = state.map && Object.hasOwn(state.map, String(raw)) ? this.tr(state.map[String(raw)]) : String(raw)
			const variant = state.variantMap && state.variantMap[String(raw)]
			return { label, variant: isBadgeVariant(variant) ? variant : 'default' }
		},

		/**
		 * The warning lines of an item.
		 *
		 * @param {object} item The item.
		 * @return {string[]}
		 */
		warningOf(item) {
			const spec = this.spec.warning
			if (!spec || !spec.list) {
				return []
			}
			return this.listOf(item, spec.list)
				.map((entry) => {
					if (typeof entry === 'string') {
						return entry
					}
					if (!entry || typeof entry !== 'object' || !spec.item) {
						return ''
					}
					return this.tr(spec.item).replace(/\{([\w.]+)\}/g, (m, path) => String(readPath(entry, path) ?? ''))
				})
				.filter((line) => line !== '')
		},

		/**
		 * Resolve the tokens in a url or payload.
		 *
		 * @param {unknown} value The value.
		 * @param {object} vars `{ value, confirmed }`.
		 * @return {unknown}
		 */
		resolve(value, vars) {
			if (Array.isArray(value)) {
				return value.map((v) => this.resolve(v, vars))
			}
			if (value && typeof value === 'object') {
				return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.resolve(v, vars)]))
			}
			if (typeof value !== 'string') {
				return value
			}
			const object = this.objectData || {}
			if (value === '@value') {
				return vars.value
			}
			if (value === '@confirmed') {
				return vars.confirmed
			}
			const whole = value.match(/^@object\.([\w.@]+)$/)
			if (whole) {
				return readPath(object, whole[1])
			}
			return value
				.replace(/@objectId/g, () => encodeURIComponent(String(this.objectId || object.id || '')))
				.replace(/@object\.([\w.@]+)/g, (m, path) => encodeURIComponent(String(readPath(object, path) ?? '')))
				.replace(/@value/g, () => encodeURIComponent(String(vars.value)))
		},

		/** Read the cards of `source`. */
		async loadSource() {
			if (!this.spec.url) {
				return
			}
			this.loading = true
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const { data } = await axios.get(prefixUrl(String(this.resolve(this.spec.url, { value: '', confirmed: false }))))
				const list = this.spec.path ? readPath(data, this.spec.path) : data
				this.sourced = Array.isArray(list) ? list : []
			} catch (e) {
				this.noticeType = 'error'
				this.notice = serverErrorMessage(e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Choose a card (nothing is written until Save).
		 *
		 * @param {object} option The card.
		 */
		choose(option) {
			this.chosen = option.key
			this.notice = ''
		},

		/**
		 * Save the chosen card: the configured request, else a PATCH of the field.
		 *
		 * @param {boolean} confirmed Whether the confirm action was pressed.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-choice-picker/specs/choice-picker/spec.md#requirement-a-risky-choice-is-saved-only-on-purpose
		 */
		async save(confirmed) {
			if (!this.selected) {
				return
			}
			const request = this.content.save
			if (!request && !this.objectUrl) {
				this.noticeType = 'error'
				this.notice = this.tr('This choice cannot be saved here.')
				return
			}
			this.saving = true
			this.notice = ''
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const vars = { value: this.selected.key, confirmed }
				if (request && request.url) {
					const method = String(request.method || 'POST').toLowerCase()
					await axios[method](prefixUrl(String(this.resolve(request.url, vars))), this.resolve(request.payload || {}, vars))
				} else {
					await axios.patch(prefixUrl(this.objectUrl), { [this.content.field]: this.selected.key })
				}
				this.saved = this.selected.key
				this.noticeType = 'success'
				this.notice = this.tr(this.content.savedText || 'Saved.')
				/**
				 * @event saved The choice was written.
				 * @type {{field: string, value: string, confirmed: boolean}}
				 */
				this.$emit('saved', { field: this.content.field, value: this.saved, confirmed })
			} catch (e) {
				this.noticeType = 'error'
				this.notice = serverErrorMessage(e)
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-choice-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.cn-choice-picker__cards {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-choice-picker__legend {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}

.cn-choice-picker__card {
	position: relative;
	display: flex;
	flex: 1 1 220px;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border: 1px solid var(--cn-board-hairline, var(--color-border));
	border-radius: 10px;
	background: var(--color-main-background);
	cursor: pointer;
}

.cn-choice-picker__card--selected {
	padding: 9px 11px;
	border: 2px solid var(--color-primary-element);
}

.cn-choice-picker__card--refused {
	cursor: not-allowed;
	opacity: 0.7;
}

.cn-choice-picker__card:focus-within {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-choice-picker__input {
	flex: 0 0 auto;
	width: 18px;
	height: 18px;
	margin: 0;
	accent-color: var(--color-primary-element);
}

.cn-choice-picker__swatches {
	display: flex;
	gap: 4px;
}

.cn-choice-picker__swatch {
	width: 18px;
	height: 18px;
	box-sizing: border-box;
	border: 1px solid var(--color-border);
	border-radius: 4px;
}

.cn-choice-picker__text {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-choice-picker__title {
	font-size: 15px;
}

.cn-choice-picker__refusal,
.cn-choice-picker__hint,
.cn-choice-picker__note {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-choice-picker__warning-intro {
	margin: 0 0 4px;
}

.cn-choice-picker__warning-list {
	margin: 0;
	padding-inline-start: 18px;
}

.cn-choice-picker__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
