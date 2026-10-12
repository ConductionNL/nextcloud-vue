<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-chips-field" data-testid="cn-chips-field">
		<p v-if="label" :id="labelId" class="cn-chips-field__label">
			{{ label }}
		</p>
		<ul class="cn-chips-field__chips" :aria-labelledby="label ? labelId : null">
			<li
				v-for="item in items"
				:key="item"
				class="cn-chips-field__chip"
				:data-testid="`cn-chips-field-chip-${item}`">
				<span class="cn-chips-field__text">{{ itemLabel(item) }}</span>
				<button
					v-if="!readOnly"
					type="button"
					class="cn-chips-field__remove"
					:disabled="busy"
					:aria-label="`${removeLabel}: ${itemLabel(item)}`"
					:data-testid="`cn-chips-field-remove-${item}`"
					@click="remove(item)">
					<span aria-hidden="true">×</span>
				</button>
			</li>
			<li v-if="!readOnly" class="cn-chips-field__add-item">
				<form v-if="adding" class="cn-chips-field__form" @submit.prevent="add">
					<select
						v-if="choices.length > 0"
						ref="input"
						v-model="draft"
						class="cn-chips-field__input"
						:aria-label="addLabel"
						data-testid="cn-chips-field-input">
						<option v-for="choice in available" :key="choice.value" :value="choice.value">
							{{ choice.label }}
						</option>
					</select>
					<input
						v-else
						ref="input"
						v-model="draft"
						class="cn-chips-field__input"
						type="text"
						:placeholder="placeholder"
						:aria-label="addLabel"
						:aria-invalid="error ? 'true' : null"
						data-testid="cn-chips-field-input"
						@keydown.esc="cancel">
					<NcButton type="submit"
						variant="secondary"
						:disabled="busy"
						data-testid="cn-chips-field-submit">
						{{ confirmLabel }}
					</NcButton>
				</form>
				<button
					v-else
					type="button"
					class="cn-chips-field__add"
					:disabled="busy || (choices.length > 0 && available.length === 0)"
					data-testid="cn-chips-field-add"
					@click="open">
					+ {{ addLabel }}
				</button>
			</li>
		</ul>
		<p v-if="error"
			class="cn-chips-field__error"
			role="alert"
			data-testid="cn-chips-field-error">
			{{ error }}
		</p>
		<p v-else-if="hint" class="cn-chips-field__hint">
			{{ hint }}
		</p>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import { objectUrlOf, patchObject } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let uid = 0

/**
 * CnChipsFieldWidget — the `chips-field` widget: a list of short strings in one
 * array field of the CURRENT object, drawn as chips with a remove button and an
 * add chip that opens a small input (or a choice of the remaining `options`).
 * Every add and remove is ONE PATCH of that field with the full new list; each
 * new entry is checked against `pattern` first, trimmed, optionally lowercased,
 * and refused when it is already there.
 *
 * @spec openspec/changes/abstract-chips-field/specs/chips-field/spec.md
 */
export default {
	name: 'CnChipsFieldWidget',

	components: { NcButton },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `field` (required) — the top-level array field of strings.
		 * - `label`, `hint`, `placeholder`.
		 * - `addLabel` — the add chip's text (default "Add").
		 * - `removeLabel`, `confirmLabel`.
		 * - `pattern`, `patternMessage` — checked on every new entry.
		 * - `lowercase` — store entries in lower case.
		 * - `options` — `[{ value, label }]`: add by choosing one of the remaining options instead of typing.
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
			labelId: `cn-chips-field-${uid}`,
			saved: null,
			adding: false,
			draft: '',
			error: '',
			busy: false,
		}
	},

	computed: {
		/** The stored list. */
		items() {
			const list = this.saved !== null ? this.saved : readPath(this.objectData || {}, this.content.field)
			return Array.isArray(list) ? list.map((item) => String(item)) : []
		},

		choices() {
			const list = Array.isArray(this.content.options) ? this.content.options : []
			return list.map((option) => (typeof option === 'object' && option !== null
				? { value: String(option.value), label: this.tr(String(option.label ?? option.value)) }
				: { value: String(option), label: this.tr(String(option)) }))
		},

		available() {
			return this.choices.filter((choice) => !this.items.includes(choice.value))
		},

		label() {
			return this.tr(this.content.label || '')
		},

		hint() {
			return this.tr(this.content.hint || '')
		},

		placeholder() {
			return this.tr(this.content.placeholder || '')
		},

		addLabel() {
			return this.tr(this.content.addLabel || 'Add')
		},

		removeLabel() {
			return this.tr(this.content.removeLabel || 'Remove')
		},

		confirmLabel() {
			return this.tr(this.content.confirmLabel || 'Add')
		},

		readOnly() {
			return this.content.readOnly === true || !this.content.field
		},

		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.saved = null
		},
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The text on a chip: an option's label, else the value.
		 *
		 * @param {string} item The stored value.
		 * @return {string}
		 */
		itemLabel(item) {
			const choice = this.choices.find((candidate) => candidate.value === item)
			return choice ? choice.label : item
		},

		open() {
			this.adding = true
			this.error = ''
			this.draft = this.choices.length > 0 && this.available.length > 0 ? this.available[0].value : ''
			this.$nextTick(() => {
				const el = this.$refs.input
				if (el && typeof el.focus === 'function') {
					el.focus()
				}
			})
		},

		cancel() {
			this.adding = false
			this.draft = ''
			this.error = ''
		},

		/**
		 * Write the new list: ONE PATCH of the field.
		 *
		 * @param {string[]} next The new list.
		 * @return {Promise<boolean>} Whether it saved.
		 */
		async write(next) {
			if (!this.objectUrl) {
				this.error = this.tr('This list cannot be saved here.')
				return false
			}
			this.busy = true
			this.error = ''
			try {
				const data = await patchObject(this.objectUrl, { [this.content.field]: next })
				const written = readPath(data, this.content.field)
				this.saved = Array.isArray(written) ? written.map((item) => String(item)) : next
				/**
				 * @event saved The list was written.
				 * @type {{field: string, value: string[]}}
				 */
				this.$emit('saved', { field: this.content.field, value: this.saved })
				return true
			} catch (e) {
				this.error = serverErrorMessage(e)
				return false
			} finally {
				this.busy = false
			}
		},

		/**
		 * Check the draft and add it.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-chips-field/specs/chips-field/spec.md#requirement-an-entry-is-checked-before-it-is-added
		 */
		async add() {
			let value = String(this.draft ?? '').trim()
			if (this.content.lowercase === true) {
				value = value.toLowerCase()
			}
			if (value === '') {
				this.error = this.tr('Fill this in.')
				return
			}
			if (this.choices.length === 0 && this.content.pattern && !new RegExp(this.content.pattern).test(value)) {
				this.error = this.tr(this.content.patternMessage || 'This value is not valid.')
				return
			}
			if (this.items.includes(value)) {
				this.error = this.tr('This is already in the list.')
				return
			}
			if (await this.write([...this.items, value])) {
				this.cancel()
			}
		},

		/**
		 * Remove one entry.
		 *
		 * @param {string} item The entry.
		 * @return {Promise<void>}
		 */
		async remove(item) {
			await this.write(this.items.filter((candidate) => candidate !== item))
		},
	},
}
</script>

<style scoped>
.cn-chips-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.cn-chips-field__label {
	margin: 0;
	font-size: 13px;
	font-weight: 600;
}

.cn-chips-field__chips {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-chips-field__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 6px 4px 12px;
	border-radius: 999px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
	font-weight: 600;
	overflow-wrap: anywhere;
}

.cn-chips-field__remove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: inherit;
	font-size: 16px;
	line-height: 1;
	cursor: pointer;
}

.cn-chips-field__remove:hover:not(:disabled),
.cn-chips-field__remove:focus-visible {
	background: var(--color-primary-element-light-hover, var(--color-background-hover));
}

.cn-chips-field__add {
	padding: 4px 12px;
	border: 1px dashed var(--color-border-maxcontrast);
	border-radius: 999px;
	background: transparent;
	color: var(--color-main-text);
	font-weight: 600;
	cursor: pointer;
}

.cn-chips-field__add:hover:not(:disabled) {
	background: var(--color-background-hover);
}

.cn-chips-field__form {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-chips-field__input {
	height: var(--cn-board-control-height, 40px);
	box-sizing: border-box;
	padding: 0 12px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--cn-board-control-radius, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
}

.cn-chips-field__hint,
.cn-chips-field__error {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-chips-field__error {
	color: var(--color-error-text);
}
</style>
