<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<fieldset class="cn-choice-cards" :aria-busy="loading ? 'true' : 'false'">
		<legend v-if="label" class="cn-choice-cards__legend">
			{{ label }}
		</legend>

		<div v-if="loading" class="cn-choice-cards__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<NcNoteCard v-else-if="normalizedOptions.length === 0" type="warning">
			{{ emptyText }}
		</NcNoteCard>

		<!-- Rows: one full-width option per row, the input on the left and the
		     title over a muted description, no card chrome. -->
		<div v-else-if="layout === 'rows'" class="cn-choice-cards__rows" data-testid="cn-choice-cards-rows">
			<div
				v-for="option in normalizedOptions"
				:key="String(option.value)"
				class="cn-choice-cards__cell"
				:class="{ 'cn-choice-cards__cell--with-details': hasDetails(option) }">
				<label
					class="cn-choice-cards__row"
					:class="{ 'cn-choice-cards__row--selected': isSelected(option), 'cn-choice-cards__row--disabled': isDisabled(option), 'cn-choice-cards__row--readonly': readonly }">
					<input
						class="cn-choice-cards__row-input"
						:type="multiple ? 'checkbox' : 'radio'"
						:name="groupName"
						:value="String(option.value)"
						:checked="isSelected(option)"
						:disabled="isDisabled(option) || readonly"
						:aria-describedby="option.disabled && option.disabledReason ? reasonId(option) : null"
						@change="onToggle(option)">
					<CnIcon v-if="option.icon"
						:name="option.icon"
						:size="20"
						class="cn-choice-cards__row-icon" />
					<span class="cn-choice-cards__row-text">
						<span class="cn-choice-cards__row-title">{{ option.label }}</span>
						<span v-if="option.description" class="cn-choice-cards__row-description">{{ option.description }}</span>
						<span
							v-if="option.disabled && option.disabledReason"
							:id="reasonId(option)"
							class="cn-choice-cards__reason"
							data-testid="cn-choice-cards-reason">{{ option.disabledReason }}</span>
					</span>
				</label>
				<div v-if="hasDetails(option)"
					class="cn-choice-cards__details"
					:data-testid="`cn-choice-cards-details-${option.value}`">
					<!-- @slot option-details The chosen option's own fields, drawn
					     inside the selected row's frame under its text (DqVolgendeStap:
					     Opschorten's reason, days and return date). Rendered only for a
					     selected option, outside the label so a field is not part of
					     the radio's label. Scope: `{ option }`. -->
					<slot name="option-details" :option="option" />
				</div>
				<div v-if="$slots['option-actions']" class="cn-choice-cards__actions">
					<slot name="option-actions" :option="option" :selected="isSelected(option)" />
				</div>
			</div>
		</div>

		<div v-else class="cn-choice-cards__grid" :style="gridStyle">
			<!-- One cell per option: the card's label, and below it whatever the
			     `#option-actions` slot adds. The slot sits OUTSIDE the label on
			     purpose: a button inside a label is interactive content inside
			     interactive content, and a click on it would toggle the radio. -->
			<div
				v-for="option in normalizedOptions"
				:key="String(option.value)"
				class="cn-choice-cards__cell">
				<label
					class="cn-choice-cards__option"
					:class="{ 'cn-choice-cards__option--selected': isSelected(option), 'cn-choice-cards__option--disabled': isDisabled(option) }">
					<!-- A REAL, VISIBLE input, not a styled div with a click handler.
					     It carries the checked state to assistive technology and to
					     Windows high-contrast mode for free, and it keeps the
					     selection perceivable without colour (WCAG 1.4.1) — the
					     card's active border alone would not be. -->
					<input
						class="cn-choice-cards__input"
						:type="multiple ? 'checkbox' : 'radio'"
						:name="groupName"
						:value="String(option.value)"
						:checked="isSelected(option)"
						:disabled="isDisabled(option) || readonly"
						:aria-describedby="option.disabled && option.disabledReason ? reasonId(option) : null"
						@change="onToggle(option)">
					<CnCard
						class="cn-choice-cards__card"
						:title="option.label"
						titleTag="span"
						:description="option.description"
						:stats="option.stats || []"
						:tags="option.tags || []"
						:active="isSelected(option)"
						activeVariant="primary"
						:descriptionLines="descriptionLines">
						<template v-if="option.icon" #icon>
							<CnIcon :name="option.icon" :size="20" />
						</template>
					</CnCard>
					<span
						v-if="option.disabled && option.disabledReason"
						:id="reasonId(option)"
						class="cn-choice-cards__reason cn-choice-cards__reason--card"
						data-testid="cn-choice-cards-reason">{{ option.disabledReason }}</span>
				</label>
				<div v-if="$slots['option-actions']" class="cn-choice-cards__actions">
					<!-- @slot option-actions Content below one card, outside its label
					     (e.g. a per-option Load button). Scope: `{ option, selected }`. -->
					<slot name="option-actions" :option="option" :selected="isSelected(option)" />
				</div>
			</div>
		</div>
		<div v-if="hasRules || clashEndpoint" class="cn-choice-cards__rules" aria-live="polite">
			<NcNoteCard
				v-for="(message, index) in ruleMessages"
				:key="`rule-${index}`"
				type="warning"
				data-testid="cn-choice-cards-rule">
				{{ message }}
			</NcNoteCard>
			<NcNoteCard
				v-for="(message, index) in clashMessages"
				:key="`clash-${index}`"
				type="warning"
				data-testid="cn-choice-cards-clash">
				{{ message }}
			</NcNoteCard>
			<NcNoteCard
				v-if="rulesMetText && ruleMessages.length === 0 && clashMessages.length === 0 && selectedValues.length > 0"
				type="success"
				data-testid="cn-choice-cards-rules-met">
				{{ rulesMetText }}
			</NcNoteCard>
		</div>
	</fieldset>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnCard from '../CnCard/CnCard.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { readPath } from '../../utils/readPath.js'

let groupSeq = 0

/**
 * CnChoiceCards — pick one option, or several, from a grid of cards.
 *
 * A card carries what a dropdown entry cannot: a description of what the
 * option actually is, and a few numbers about it. Use it where the choice
 * deserves explaining — the setup wizard's example-data step, an onboarding
 * template picker — and a plain `NcSelect` where a label already says enough.
 *
 * Each card is a `<label>` around a real radio (or checkbox when `multiple`),
 * so keyboard navigation, the checked state and high-contrast rendering are
 * the browser's, not a reimplementation.
 *
 * ```vue
 * <CnChoiceCards
 *   v-model="picked"
 *   label="Which kind of organisation is this for?"
 *   :options="[
 *     { value: 'municipality', label: 'Municipality',
 *       description: 'A city council with committees and a decision list.',
 *       stats: [{ label: 'Objects', value: 170 }] },
 *     { value: 'none', label: 'None, I will set this up myself' },
 *   ]" />
 * ```
 */
export default {
	name: 'CnChoiceCards',

	components: {
		CnCard,
		CnIcon,
		NcLoadingIcon,
		NcNoteCard,
	},

	props: {
		/**
		 * The options to offer. Each: `{ value, label, description?, stats?,
		 * tags?, icon?, disabled?, disabledReason? }` — `icon` is a PascalCase
		 * MDI name resolved by CnIcon; a `disabled` option is greyed out and
		 * cannot be picked, with `disabledReason` shown under it.
		 */
		options: {
			type: Array,
			default: () => [],
		},

		/**
		 * The selected value: a scalar, or an array when `multiple`.
		 *
		 * @type {string|number|boolean|Array|null}
		 */
		modelValue: {
			// eslint-disable-next-line vue/prefer-prop-type-boolean-first -- an option value of '' must stay a string
			type: [String, Number, Boolean, Array, Object],
			default: null,
		},

		/** Allow selecting several cards; the model becomes an array. */
		multiple: {
			type: Boolean,
			default: false,
		},

		/** Group label, rendered as the fieldset's legend. */
		label: {
			type: String,
			default: '',
		},

		/** Disable every card (e.g. a dependent choice with no parent value yet). */
		disabled: {
			type: Boolean,
			default: false,
		},

		/**
		 * Show the choice without letting it change: every option at full
		 * contrast, the selected one marked, nothing pickable (DqBesluit's
		 * recorded outcome). `disabled` greys the options out instead.
		 */
		readonly: {
			type: Boolean,
			default: false,
		},

		/** Show a spinner instead of the grid while options are being fetched. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Message shown when there is nothing to choose from. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'Nothing to choose from here.'),
		},

		/**
		 * `cards`: a grid of cards with stats and tags. `rows`: one option per
		 * row, full width, the input on the left and the title over a muted
		 * description; with `multiple` and one option it is a checkbox card.
		 */
		layout: {
			type: String,
			default: 'cards',
			validator: (value) => ['cards', 'rows'].includes(value),
		},

		/** Columns of the card grid; 0 lets the grid fit as many as the width allows. */
		columns: {
			type: Number,
			default: 0,
		},

		/** Lines of description shown before clamping. */
		descriptionLines: {
			type: Number,
			default: 4,
		},

		/**
		 * Rules a multiple choice is checked against live: `{ min?, max?,
		 * together?: [[values]], exclusive?: [[values]] }`. A broken rule is a
		 * note under the cards; the server still decides.
		 */
		rules: {
			type: Object,
			default: null,
		},

		/** The note when the selection breaks no rule and no clash is answered. */
		rulesMetText: {
			type: String,
			default: '',
		},

		/**
		 * `{ url, params?, responsePath? }`: an endpoint answering notices
		 * (strings) for the picked values, read again when the selection
		 * changes. `@selected` in a param is the picked values, comma-joined;
		 * nothing is read while nothing is picked.
		 */
		clashEndpoint: {
			type: Object,
			default: null,
		},
	},

	emits: ['update:modelValue'],

	data() {
		groupSeq += 1
		return {
			// Radios only group by `name`, so two card groups on one page would
			// otherwise share a selection.
			groupName: 'cn-choice-cards-' + groupSeq,
			clashMessages: [],
		}
	},

	computed: {
		hasRules() {
			return Boolean(this.rules && typeof this.rules === 'object')
		},

		/**
		 * One sentence per rule the selection breaks.
		 *
		 * @return {string[]}
		 * @spec openspec/changes/choice-cards-rules/specs/choice-cards/spec.md#requirement-a-multiple-choice-shows-its-rules-live
		 */
		ruleMessages() {
			if (!this.hasRules) {
				return []
			}
			const picked = this.selectedValues.map(String)
			const count = picked.length
			const name = (value) => (this.normalizedOptions.find((option) => String(option.value) === String(value)) || { label: String(value) }).label
			const list = (values) => {
				const names = values.map(name)
				return names.length > 1 ? t('nextcloud-vue', '{list} and {last}', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] }) : (names[0] || '')
			}
			const out = []
			if (Number.isInteger(this.rules.min) && count < this.rules.min) {
				out.push(t('nextcloud-vue', 'Choose at least {min} (now {count}).', { min: this.rules.min, count }))
			}
			if (Number.isInteger(this.rules.max) && count > this.rules.max) {
				out.push(t('nextcloud-vue', 'Choose at most {max} (now {count}).', { max: this.rules.max, count }))
			}
			for (const group of Array.isArray(this.rules.together) ? this.rules.together : []) {
				const values = (Array.isArray(group) ? group : []).map(String)
				const chosen = values.filter((value) => picked.includes(value))
				if (chosen.length > 0 && chosen.length < values.length) {
					out.push(t('nextcloud-vue', 'Choose {list} together.', { list: list(values) }))
				}
			}
			for (const group of Array.isArray(this.rules.exclusive) ? this.rules.exclusive : []) {
				const values = (Array.isArray(group) ? group : []).map(String)
				if (values.filter((value) => picked.includes(value)).length > 1) {
					out.push(t('nextcloud-vue', 'Choose only one of {list}.', { list: list(values) }))
				}
			}
			return out
		},

		/** @return {string} Changes when the clash endpoint must be read again. */
		clashKey() {
			return this.clashEndpoint && this.clashEndpoint.url ? JSON.stringify([this.clashEndpoint, this.selectedValues]) : ''
		},

		/**
		 * Options with a usable `value` and `label`, tolerating the shapes a
		 * server list arrives in: `id` instead of `value`, `name` instead of
		 * `label`, and a bare string for a value that is its own label.
		 *
		 * @return {Array<object>} The normalised options.
		 */
		normalizedOptions() {
			return (this.options || [])
				.filter((option) => option !== null && option !== undefined)
				.map((option) => {
					if (typeof option !== 'object') {
						return { value: option, label: String(option) }
					}
					const value = option.value !== undefined ? option.value : option.id
					return {
						...option,
						value,
						label: option.label || option.name || String(value),
					}
				})
				.filter((option) => option.value !== undefined)
		},

		/**
		 * The current selection as an array of values, whatever the model shape.
		 *
		 * @return {Array} The selected values.
		 */
		selectedValues() {
			if (this.multiple) {
				return Array.isArray(this.modelValue) ? this.modelValue : []
			}
			return (this.modelValue === null || this.modelValue === undefined || this.modelValue === '')
				? []
				: [this.modelValue]
		},

		/**
		 * Inline override for the grid's column count. `auto-fit` with a
		 * 260px minimum wraps a small option count onto its own row well
		 * before the container is actually too narrow for them side by
		 * side — two cards would stack at ~550px wide even though halving
		 * the available width still leaves each one legible. A binary (or
		 * near-binary) choice should always sit in one row and fill the
		 * available width; a larger option count keeps the responsive
		 * `auto-fit` wrapping from the stylesheet (`{}` leaves it alone).
		 *
		 * @return {object} A `gridTemplateColumns` override, or `{}`.
		 */
		gridStyle() {
			if (this.columns > 0) {
				return { gridTemplateColumns: `repeat(${this.columns}, minmax(0, 1fr))` }
			}
			const count = this.normalizedOptions.length
			if (count > 0 && count <= 2) {
				return { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }
			}
			return {}
		},
	},

	watch: {
		clashKey: {
			immediate: true,
			handler() {
				this.loadClashes()
			},
		},
	},

	methods: {
		/**
		 * Read the notices the clash endpoint answers for the picked values.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/choice-cards-rules/specs/choice-cards/spec.md#requirement-a-multiple-choice-shows-its-rules-live
		 */
		async loadClashes() {
			const endpoint = this.clashEndpoint
			if (!endpoint || !endpoint.url || this.selectedValues.length === 0) {
				this.clashMessages = []
				return
			}
			const key = this.clashKey
			const selected = this.selectedValues.map(String).join(',')
			const params = {}
			for (const [name, value] of Object.entries(endpoint.params || {})) {
				params[name] = value === '@selected' ? selected : value
			}
			const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
			const list = await axios.get(generateUrl(endpoint.url), { params })
				.then(({ data }) => (endpoint.responsePath ? readPath(data, endpoint.responsePath) : data))
				.catch(() => [])
			if (key === this.clashKey) {
				this.clashMessages = (Array.isArray(list) ? list : []).filter((message) => typeof message === 'string' && message !== '')
			}
		},

		/**
		 * Whether an option is currently selected.
		 *
		 * Compares as strings: a value that made the round trip through the
		 * server as `"1"` must still match the `1` it was sent as.
		 *
		 * @param {object} option The normalised option.
		 * @return {boolean} True when selected.
		 */
		/**
		 * Whether a rows option draws the `option-details` slot in its frame:
		 * the slot is given and the option is the chosen one.
		 *
		 * @param {object} option The option.
		 * @return {boolean}
		 */
		hasDetails(option) {
			return Boolean(this.$slots['option-details']) && this.isSelected(option)
		},

		/**
		 * Whether an option cannot be picked: the whole group is disabled, or the option is.
		 *
		 * @param {object} option The normalised option.
		 * @return {boolean} True when disabled.
		 */
		isDisabled(option) {
			return this.disabled || option.disabled === true
		},

		/**
		 * Id of an option's disabled reason, for `aria-describedby`.
		 *
		 * @param {object} option The normalised option.
		 * @return {string} The id.
		 */
		reasonId(option) {
			return `${this.groupName}-reason-${String(option.value).replace(/[^A-Za-z0-9_-]/g, '-')}`
		},

		isSelected(option) {
			return this.selectedValues.some((v) => String(v) === String(option.value))
		},

		/**
		 * Select (single) or toggle (multiple) an option and emit the new model.
		 *
		 * @param {object} option The normalised option.
		 * @return {void}
		 */
		onToggle(option) {
			if (this.readonly || this.isDisabled(option)) {
				return
			}
			if (!this.multiple) {
				/**
				 * @event update:modelValue The selected value, or the array of values when `multiple`.
				 * @type {string|number|boolean|Array}
				 */
				// Never the option OBJECT: a parent has to be able to hand back
				// what it receives as `modelValue`.
				this.$emit('update:modelValue', option.value)
				return
			}
			const next = this.selectedValues.filter((v) => String(v) !== String(option.value))
			if (next.length === this.selectedValues.length) {
				next.push(option.value)
			}
			this.$emit('update:modelValue', next)
		},
	},
}
</script>

<style scoped lang="scss">
.cn-choice-cards {
	border: none;
	padding: 0;
	margin: 0;
	min-inline-size: 0;
}

.cn-choice-cards__legend {
	padding: 0;
	margin-block-end: 8px;
	font-weight: bold;
}

.cn-choice-cards__loading {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}

.cn-choice-cards__grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 12px;
	/* Room for the card shadow. `src/css/card.css` is loaded globally by every
	   consumer and gives EVERY `.cn-card` a `box-shadow` — including these — so
	   a grid flush against its container gets the shadow shaved off wherever
	   that container clips, which the setup wizard's dialog body does on the
	   sides and the bottom. 12px clears the widest of those shadows. */
	padding: 12px;
}

.cn-choice-cards__cell {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-inline-size: 0;
}

.cn-choice-cards__actions {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-choice-cards__option {
	position: relative;
	display: block;
	cursor: pointer;
}

.cn-choice-cards__input {
	position: absolute;
	inset-block-start: 16px;
	inset-inline-end: 14px;
	z-index: 1;
	margin: 0;
	cursor: pointer;
}

/* Room for the input, so a long title never runs underneath it. */
.cn-choice-cards__option :deep(.cn-card) {
	padding-inline-end: 44px;
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* The same global `card.css` also scales `.cn-card` up on hover. A transform
   counts towards the scrollable overflow of the nearest scroll container, so in
   a dialog body sized to its content a scrollbar appears the moment the pointer
   touches a card, and the grid twitches. The border colour below already
   carries hover, so the scale is dropped: at (0,3,0) this beats the global
   `.cn-card:hover` at (0,2,0). */
.cn-choice-cards__option:hover :deep(.cn-card) {
	border-color: var(--color-primary-element);
	transform: none;
}

/* The focus ring belongs on the card, not on the small input inside it. */
.cn-choice-cards__input:focus-visible + :deep(.cn-card) {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-choice-cards__input:disabled {
	cursor: default;
}

.cn-choice-cards__option--disabled .cn-choice-cards__input + :deep(.cn-card) {
	opacity: 0.6;
}

.cn-choice-cards__rows {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* 12px 14px, as the boards draw an option row (DqVolgendeStap, DqBesluit). */
.cn-choice-cards__row {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
	cursor: pointer;
}

.cn-choice-cards__row:hover {
	border-color: var(--color-border-dark);
}

.cn-choice-cards__row--selected,
.cn-choice-cards__row--selected:hover {
	border-color: var(--color-primary-element);
	/* The second pixel of the 2px selected border, without moving the content. */
	box-shadow: inset 0 0 0 1px var(--color-primary-element);
	background: var(--color-primary-element-light);
}

/* An option this record does not allow: the grey ground and the muted ink,
   still legible (DqVolgendeStap), not faded. */
.cn-choice-cards__row--disabled,
.cn-choice-cards__row--disabled:hover {
	border-color: var(--color-border);
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	cursor: default;
}

/* The title takes the muted ink itself: a theme that colours every label
   with `!important` (thematiq) would otherwise hand it the label colour. */
.cn-choice-cards__row--disabled .cn-choice-cards__row-title {
	color: var(--color-text-maxcontrast);
}

/* The chosen option's fields share the selected row's frame: the cell draws
   the 2px primary border and the ground, the row inside it draws none, and
   the fields sit under the text, indented to it (DqVolgendeStap). */
.cn-choice-cards__cell--with-details {
	border: 1px solid var(--color-primary-element);
	border-radius: var(--border-radius-large, 8px);
	box-shadow: inset 0 0 0 1px var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-choice-cards__cell--with-details .cn-choice-cards__row,
.cn-choice-cards__cell--with-details .cn-choice-cards__row:hover {
	border-color: transparent;
	box-shadow: none;
	background: transparent;
}

.cn-choice-cards__details {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 0 14px 14px 44px;
}

.cn-choice-cards__row--readonly {
	cursor: default;
}

.cn-choice-cards__row--readonly:not(.cn-choice-cards__row--selected):hover {
	border-color: var(--color-border);
}

.cn-choice-cards__row:has(.cn-choice-cards__row-input:focus-visible) {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-choice-cards__row-input {
	flex: none;
	margin: 2px 0 0;
	accent-color: var(--color-primary-element);
	cursor: inherit;
}

.cn-choice-cards__row-icon {
	flex: none;
}

.cn-choice-cards__row-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-choice-cards__row-title {
	font-size: 15px;
	font-weight: 600;
}

/* Regular weight on the span itself: a theme that sets every label bold
   with `!important` (thematiq) reaches a span that only inherits. */
.cn-choice-cards__row-description,
.cn-choice-cards__reason {
	font-size: 13px;
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

.cn-choice-cards__reason--card {
	display: block;
	margin-block-start: 4px;
}
</style>
