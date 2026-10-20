<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-search-select" :class="{ 'cn-search-select--label-outside': labelOutside }" data-testid="cn-search-select">
		<NcSelect
			:inputId="inputId"
			:inputLabel="inputLabel"
			:labelOutside="labelOutside"
			:modelValue="selectedOption"
			:options="options"
			:loading="loading"
			:clearable="clearable"
			:disabled="disabled"
			:placeholder="resolvedPlaceholder"
			:filterable="filterable"
			label="label"
			@search="onSearch"
			@update:modelValue="onInput">
			<template #option="option">
				<span class="cn-search-select__row" data-testid="cn-search-select-row">
					<span
						v-if="option.avatar || option.icon"
						class="cn-search-select__lead"
						:class="{ 'cn-search-select__lead--avatar': option.avatar && !option.icon }"
						aria-hidden="true">
						<CnIcon v-if="option.icon" :name="option.icon" :size="18" />
						<template v-else>{{ initialsOf(option) }}</template>
					</span>
					<span class="cn-search-select__text">
						<span class="cn-search-select__name">{{ option.label }}</span>
						<span v-if="option.secondary" class="cn-search-select__secondary">{{ option.secondary }}</span>
					</span>
					<Check
						v-if="isSelected(option)"
						class="cn-search-select__check"
						:size="18"
						data-testid="cn-search-select-check" />
				</span>
			</template>
		</NcSelect>
		<Magnify class="cn-search-select__magnifier" :size="18" aria-hidden="true" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { initialsOf } from '../../utils/initials.js'

/**
 * CnSearchSelect — a single picker drawn as a search field: a magnifier
 * instead of the chevron, and results as rows with an icon or initials, a
 * name, a secondary line and a check on the chosen one (boards DqOverdragen
 * "Nieuw team", DqNieuweZaak "Aanvrager").
 *
 * Each option is `{ id, label, secondary?, icon?, avatar? }`: `icon` names a
 * CnIcon, `avatar: true` draws the label's initials in a circle. The value is
 * the option's `id` (or `value`); `update:modelValue` emits that id, or null
 * when cleared. Searching is the host's: listen to `search` and pass new
 * `options`, with `filterable: false` when the host already filtered them.
 *
 * ```vue
 * <CnSearchSelect
 *   v-model="team"
 *   inputLabel="Nieuw team"
 *   :options="[{ id: 'legal', label: 'Juridische zaken', secondary: '6 leden · bezwaar, beroep en Woo-advies', avatar: true }]" />
 * ```
 */
export default {
	name: 'CnSearchSelect',

	components: { Check, CnIcon, Magnify, NcSelect },

	props: {
		/** The chosen option's id, or the option itself. */
		modelValue: {
			type: [String, Number, Object],
			default: null,
		},

		/**
		 * The options: `{ id, label, secondary?, icon?, avatar? }`.
		 *
		 * @type {Array<{id: (string|number), label: string, secondary?: string, icon?: string, avatar?: boolean}>}
		 */
		options: {
			type: Array,
			default: () => [],
		},

		/** The field's label. */
		inputLabel: {
			type: String,
			default: '',
		},

		/** Draw the label above the field instead of inside it. */
		labelOutside: {
			type: Boolean,
			default: false,
		},

		/** The input's id. */
		inputId: {
			type: String,
			default: undefined,
		},

		/** Placeholder text; defaults to "Search…". */
		placeholder: {
			type: String,
			default: '',
		},

		/** Show the loading spinner. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Offer a clear button. */
		clearable: {
			type: Boolean,
			default: true,
		},

		/** Disable the field. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** Filter the options on the typed text; false when the host searches. */
		filterable: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['update:modelValue', 'search'],

	computed: {
		/**
		 * The option matching `modelValue`, or a bare one carrying it.
		 *
		 * @return {object|null}
		 */
		selectedOption() {
			const value = this.modelValue
			if (value === null || value === undefined || value === '') {
				return null
			}
			if (typeof value === 'object') {
				return value
			}
			return this.options.find((o) => this.idOf(o) === String(value)) || { id: value, label: String(value) }
		},

		/** @return {string} The placeholder. */
		resolvedPlaceholder() {
			return this.placeholder || t('nextcloud-vue', 'Search…')
		},
	},

	methods: {
		initialsOf(option) {
			return initialsOf(option.label || '')
		},

		/**
		 * @param {object} option An option.
		 * @return {string} Its id as a string, '' without one.
		 */
		idOf(option) {
			const id = option && (option.id ?? option.value)
			return id === null || id === undefined ? '' : String(id)
		},

		/**
		 * @param {object} option An option.
		 * @return {boolean} Whether it is the chosen one.
		 */
		isSelected(option) {
			return this.selectedOption !== null && this.idOf(option) !== '' && this.idOf(option) === this.idOf(this.selectedOption)
		},

		/**
		 * @param {object|null} option The picked option.
		 */
		onInput(option) {
			const id = option ? (option.id ?? option.value ?? null) : null
			/** @event update:modelValue The picked option's id, or null when cleared. */
			this.$emit('update:modelValue', id)
		},

		/**
		 * @param {string} query The typed text.
		 */
		onSearch(query) {
			/** @event search The typed text, for a host that searches itself. */
			this.$emit('search', query)
		},
	},
}
</script>

<style scoped>
.cn-search-select {
	position: relative;
}

/* The field takes the row: NcSelect is an inline block of at least 260px,
   which left the magnifier, placed at the row's end, outside the field
   (DqOverdragen "Nieuw team"). */
.cn-search-select :deep(.v-select) {
	width: 100%;
}

/* The magnifier sits where the chevron was: in the field, at its end. */
.cn-search-select__magnifier {
	position: absolute;
	inset-inline-end: 12px;
	bottom: 0;
	height: var(--default-clickable-area, 34px);
	display: flex;
	align-items: center;
	z-index: 1;
	color: var(--color-text-maxcontrast);
	pointer-events: none;
}

.cn-search-select :deep(.vs__open-indicator),
.cn-search-select :deep(.vs__open-indicator-button) {
	display: none;
}

.cn-search-select :deep(.vs__actions) {
	padding-inline-end: 36px;
}

.cn-search-select__row {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-width: 0;
	padding: 4px 0;
}

.cn-search-select__lead {
	flex: 0 0 32px;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 13px;
	font-weight: 600;
}

.cn-search-select__text {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-search-select__name {
	font-weight: 600;
	overflow-wrap: anywhere;
}

.cn-search-select__secondary {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	overflow-wrap: anywhere;
}

.cn-search-select__check {
	flex: 0 0 auto;
	color: var(--color-primary-element);
}
</style>
