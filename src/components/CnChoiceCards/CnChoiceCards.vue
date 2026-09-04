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

		<div v-else class="cn-choice-cards__grid">
			<label
				v-for="option in normalizedOptions"
				:key="String(option.value)"
				class="cn-choice-cards__option"
				:class="{ 'cn-choice-cards__option--selected': isSelected(option) }">
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
					:disabled="disabled"
					@change="onToggle(option)">
				<CnCard
					class="cn-choice-cards__card"
					:title="option.label"
					title-tag="span"
					:description="option.description"
					:stats="option.stats || []"
					:tags="option.tags || []"
					:active="isSelected(option)"
					active-variant="primary"
					:description-lines="descriptionLines">
					<template v-if="option.icon" #icon>
						<CnIcon :name="option.icon" :size="20" />
					</template>
				</CnCard>
			</label>
		</div>
	</fieldset>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnCard from '../CnCard/CnCard.vue'
import CnIcon from '../CnIcon/CnIcon.vue'

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
		 * tags?, icon? }` — `icon` is a PascalCase MDI name resolved by CnIcon.
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
		/** Lines of description shown before clamping. */
		descriptionLines: {
			type: Number,
			default: 4,
		},
	},

	emits: ['update:modelValue'],

	data() {
		groupSeq += 1
		return {
			// Radios only group by `name`, so two card groups on one page would
			// otherwise share a selection.
			groupName: 'cn-choice-cards-' + groupSeq,
		}
	},

	computed: {
		/**
		 * Options with a usable `value` and `label`, tolerating the shapes a
		 * server list arrives in: `id` instead of `value`, `name` instead of
		 * `label`, and a bare string for a value that is its own label.
		 *
		 * @return {Array<object>} The normalised options.
		 */
		normalizedOptions() {
			return (this.options || [])
				.filter((option) => option != null)
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
	},

	methods: {
		/**
		 * Whether an option is currently selected.
		 *
		 * Compares as strings: a value that made the round trip through the
		 * server as `"1"` must still match the `1` it was sent as.
		 *
		 * @param {object} option The normalised option.
		 * @return {boolean} True when selected.
		 */
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
			if (this.disabled) {
				return
			}
			if (!this.multiple) {
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

.cn-choice-cards__option:hover :deep(.cn-card) {
	border-color: var(--color-primary-element);
}

/* The focus ring belongs on the card, not on the small input inside it. */
.cn-choice-cards__input:focus-visible + :deep(.cn-card) {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-choice-cards__input:disabled {
	cursor: default;
}

.cn-choice-cards__input:disabled + :deep(.cn-card) {
	opacity: 0.6;
}
</style>
