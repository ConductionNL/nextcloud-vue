<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<fieldset class="cn-radio-cards"
		:class="{ 'cn-radio-cards--list': isList }"
		data-testid="cn-radio-cards"
		:aria-busy="busy ? 'true' : 'false'">
		<legend v-if="label" class="cn-radio-cards__legend">
			{{ label }}
		</legend>
		<div class="cn-radio-cards__grid" :class="`cn-radio-cards__grid--${columns}`">
			<label
				v-for="option in options"
				:key="String(option.value)"
				class="cn-radio-cards__card"
				:class="{ 'cn-radio-cards__card--selected': isSelected(option) }"
				:data-testid="`cn-radio-cards-option-${option.value}`">
				<input
					class="cn-radio-cards__input"
					type="radio"
					:name="groupName"
					:value="String(option.value)"
					:checked="isSelected(option)"
					:disabled="readOnly || busy"
					@change="choose(option)">
				<span class="cn-radio-cards__dot" aria-hidden="true" />
				<span class="cn-radio-cards__text">
					<span class="cn-radio-cards__title">{{ option.label }}</span>
					<span v-if="option.description" class="cn-radio-cards__description">{{ option.description }}</span>
				</span>
			</label>
		</div>
		<NcNoteCard v-if="notice" type="error" data-testid="cn-radio-cards-notice">
			{{ notice }}
		</NcNoteCard>
	</fieldset>
</template>

<script>
import { NcNoteCard } from '@nextcloud/vue'
import { objectUrlOf, writeFields } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let uid = 0

/**
 * CnRadioCardsWidget — the `radio-cards` widget: one choice out of a few cards,
 * each with a title and a description, bound to an enum field of the CURRENT
 * object. Choosing a card saves at once with ONE PATCH of that field; a refused
 * PATCH puts the choice back and shows the server's words. Real radio inputs
 * underneath, so the choice is perceivable without colour and works from the
 * keyboard.
 *
 * @spec openspec/changes/abstract-radio-cards/specs/abstract-radio-cards/spec.md
 */
export default {
	name: 'CnRadioCardsWidget',

	components: { NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `field` (required) — the enum field, a top-level name or a dot-path.
		 * - `save` — `{ url, method?, payload? }`, write through an app endpoint (tokens `{value}`, `{field}`, `{changes}`, `{object.<path>}`).
		 * - `options` (required) — `[{ value, label, description? }]`.
		 * - `label` — a legend over the cards (visually shown).
		 * - `columns` — 1, 2 or 3 (default 2).
		 * - `variant` — `cards` (the default) or `list`: a compact list of radio buttons, one per line, with the description under the label and no card around each (board DcBeheer). A list is one column.
		 * - `readOnly`.
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
			groupName: `cn-radio-cards-${uid}`,
			saved: '',
			value: '',
			busy: false,
			notice: '',
		}
	},

	computed: {
		options() {
			const list = Array.isArray(this.content.options) ? this.content.options : []
			return list
				.filter((option) => option !== null && option !== undefined)
				.map((option) => (typeof option === 'object'
					? { value: option.value, label: this.tr(String(option.label ?? option.value)), description: this.tr(option.description || '') }
					: { value: option, label: this.tr(String(option)), description: '' }))
		},

		label() {
			return this.tr(this.content.label || '')
		},

		/**
		 * Whether the options draw as a compact list (`variant: "list"`).
		 *
		 * @return {boolean}
		 * @spec openspec/changes/screens-radio-cards-list/specs/radio-cards/spec.md#requirement-radio-cards-can-draw-as-a-compact-list
		 */
		isList() {
			return this.content.variant === 'list'
		},

		columns() {
			if (this.isList) {
				return 1
			}
			return [1, 3].includes(this.content.columns) ? this.content.columns : 2
		},

		readOnly() {
			return this.content.readOnly === true
		},

		/** Whether the widget writes through the app's own endpoint (`content.save`). */
		hasSave() {
			return !!(this.content.save && this.content.save.url)
		},

		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.adopt()
		},
	},

	created() {
		this.adopt()
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/** Read the choice off the object. */
		adopt() {
			const stored = readPath(this.objectData || {}, this.content.field)
			this.saved = stored === undefined || stored === null ? '' : String(stored)
			this.value = this.saved
		},

		isSelected(option) {
			return this.value === String(option.value)
		},

		/**
		 * Choose a card and save that one field.
		 *
		 * @param {object} option The chosen option.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-radio-cards/specs/abstract-radio-cards/spec.md#requirement-choosing-a-card-saves-that-one-field
		 */
		async choose(option) {
			if ((!this.objectUrl && !this.hasSave) || !this.content.field) {
				this.notice = this.tr('This choice cannot be saved here.')
				return
			}
			this.notice = ''
			this.busy = true
			this.value = String(option.value)
			try {
				const data = await writeFields(this.objectUrl, { [this.content.field]: option.value }, { save: this.content.save, object: this.objectData })
				const written = readPath(data, this.content.field)
				this.saved = String(written !== undefined && written !== null ? written : option.value)
				this.value = this.saved
				/**
				 * @event saved The choice was written.
				 * @type {{field: string, value: unknown}}
				 */
				this.$emit('saved', { field: this.content.field, value: option.value })
			} catch (e) {
				this.value = this.saved
				this.notice = serverErrorMessage(e)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-radio-cards {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-radio-cards__legend {
	padding: 0;
	margin-bottom: 6px;
	font-weight: 600;
}

.cn-radio-cards__grid {
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(0, 1fr);
}

.cn-radio-cards__grid--2 {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cn-radio-cards__grid--3 {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cn-radio-cards__card {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 14px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--cn-board-control-radius, 8px);
	background: var(--color-main-background);
	cursor: pointer;
}

.cn-radio-cards__card--selected {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
	box-shadow: 0 0 0 1px var(--color-primary-element);
}

.cn-radio-cards__card:focus-within {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* The real input stays in the DOM and in the accessibility tree; the dot is its picture. */
.cn-radio-cards__input {
	position: absolute;
	opacity: 0;
	inset: 0;
	margin: 0;
	cursor: pointer;
}

.cn-radio-cards__dot {
	flex: 0 0 auto;
	width: 14px;
	height: 14px;
	margin-top: 3px;
	box-sizing: border-box;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: 50%;
	background: var(--color-main-background);
}

.cn-radio-cards__card--selected .cn-radio-cards__dot {
	border: 4px solid var(--color-primary-element);
}

.cn-radio-cards__text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-radio-cards__title {
	font-weight: 600;
}

.cn-radio-cards__description {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

/* `variant: "list"`: one radio button per line, the description under the
   label, no card around each (board DcBeheer, "Soort organisatie"). */
.cn-radio-cards--list .cn-radio-cards__grid {
	gap: 8px;
}

.cn-radio-cards--list .cn-radio-cards__card,
.cn-radio-cards--list .cn-radio-cards__card--selected {
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;
	font-size: 15px;
}

.cn-radio-cards--list .cn-radio-cards__dot {
	width: 18px;
	height: 18px;
	margin-top: 2px;
}

.cn-radio-cards--list .cn-radio-cards__card--selected .cn-radio-cards__dot {
	border-width: 5px;
}

.cn-radio-cards--list .cn-radio-cards__title {
	font-weight: 400;
}

.cn-radio-cards--list .cn-radio-cards__description {
	font-size: 13px;
}

@media (max-width: 640px) {
	.cn-radio-cards__grid--2,
	.cn-radio-cards__grid--3 {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
