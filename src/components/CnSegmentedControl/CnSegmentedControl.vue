<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-segmented-control"
		:class="{ 'cn-segmented-control--stretch': stretch }"
		role="radiogroup"
		:aria-label="ariaLabel || null"
		:aria-labelledby="ariaLabelledby || null"
		@keydown="onKeydown">
		<button
			v-for="(option, index) in normalizedOptions"
			:key="option.key"
			type="button"
			role="radio"
			class="cn-segmented-control__option"
			:class="{ 'cn-segmented-control__option--checked': isChecked(option) }"
			:aria-checked="isChecked(option) ? 'true' : 'false'"
			:tabindex="index === focusableIndex ? 0 : -1"
			:disabled="option.disabled || null"
			:data-value="option.key"
			@click="select(option)">
			<!-- @slot option Replaces the content of one option. -->
			<!-- @binding {object} option The option: `{ value, label, disabled, count }`. -->
			<!-- @binding {boolean} checked Whether this option is the chosen one. -->
			<slot name="option" :option="option" :checked="isChecked(option)">
				<span class="cn-segmented-control__label">{{ option.label }}</span>
				<span v-if="option.count !== null" class="cn-segmented-control__count">{{ option.count }}</span>
			</slot>
		</button>
	</div>
</template>

<script>
/**
 * CnSegmentedControl is a switch between a few views of the same thing, such
 * as "My work / My team". One option is always the chosen one.
 *
 * It is a radio group: screen readers announce the group and which option is
 * checked, the arrow keys move the choice, and Tab enters and leaves the group
 * in one step. Give it a name with `aria-label` (or `aria-labelledby`).
 *
 * ```vue
 * <CnSegmentedControl
 *   v-model="view"
 *   aria-label="View"
 *   :options="[
 *     { value: 'mine', label: 'My work' },
 *     { value: 'team', label: 'My team' },
 *   ]" />
 * ```
 *
 * To switch between panels of content, use `CnTabs` with `variant="segmented"`
 * instead: that keeps the tab and panel semantics and looks the same.
 */
export default {
	name: 'CnSegmentedControl',

	props: {
		/**
		 * The options. Each is `{ value, label, disabled?, count? }`, or a
		 * plain string that is both the value and the label. `count` shows a
		 * number after the label.
		 *
		 * @type {Array<string|{value: (string|number|boolean), label: string, disabled?: boolean, count?: number}>}
		 */
		options: {
			type: Array,
			required: true,
		},

		/**
		 * The value of the chosen option (v-model).
		 *
		 * @type {string|number|boolean|null}
		 */
		modelValue: {
			type: [Boolean, String, Number],
			default: null,
		},

		/** Accessible name of the group, read out when focus enters it. */
		ariaLabel: {
			type: String,
			default: '',
		},

		/** Id of an element that names the group, as an alternative to `ariaLabel`. */
		ariaLabelledby: {
			type: String,
			default: '',
		},

		/** Stretch the control to the full width, with options of equal width. */
		stretch: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * Emitted with the value of the newly chosen option.
		 *
		 * @event update:modelValue
		 * @type {string|number|boolean}
		 */
		'update:modelValue',
	],

	computed: {
		/**
		 * The options in one shape.
		 *
		 * @return {Array<{key: string, value: (string|number|boolean), label: string, disabled: boolean, count: (number|null)}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
		 */
		normalizedOptions() {
			return (Array.isArray(this.options) ? this.options : [])
				.filter((option) => option !== null && option !== undefined)
				.map((option) => {
					if (typeof option !== 'object') {
						return { key: String(option), value: option, label: String(option), disabled: false, count: null }
					}
					return {
						key: String(option.value),
						value: option.value,
						label: String(option.label ?? option.value),
						disabled: option.disabled === true,
						count: Number.isFinite(option.count) ? option.count : null,
					}
				})
		},

		/**
		 * The option Tab lands on: the chosen one, else the first enabled one.
		 *
		 * @return {number} Its index, or -1 when no option can take focus.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
		 */
		focusableIndex() {
			const checked = this.normalizedOptions.findIndex((option) => this.isChecked(option) && !option.disabled)
			if (checked !== -1) {
				return checked
			}
			return this.normalizedOptions.findIndex((option) => !option.disabled)
		},
	},

	methods: {
		/**
		 * Whether an option is the chosen one.
		 *
		 * @param {{value: (string|number|boolean)}} option The option.
		 * @return {boolean}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
		 */
		isChecked(option) {
			return this.modelValue !== null && String(option.value) === String(this.modelValue)
		},

		/**
		 * Choose an option.
		 *
		 * @param {{value: (string|number|boolean), disabled: boolean}} option The option.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
		 */
		select(option) {
			if (option.disabled || this.isChecked(option)) {
				return
			}
			this.$emit('update:modelValue', option.value)
		},

		/**
		 * Arrow keys, Home and End move the choice, as in a native radio
		 * group. Disabled options are passed over and the ends wrap around.
		 *
		 * @param {KeyboardEvent} event The key press.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
		 */
		onKeydown(event) {
			const enabled = this.normalizedOptions
				.map((option, index) => ({ option, index }))
				.filter((entry) => !entry.option.disabled)
			if (enabled.length === 0) {
				return
			}
			const buttons = Array.from(this.$el.querySelectorAll('[role="radio"]'))
			const focused = buttons.indexOf(document.activeElement)
			const from = focused !== -1 ? focused : this.focusableIndex
			let position = enabled.findIndex((entry) => entry.index === from)
			if (position === -1) {
				position = 0
			}
			if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
				position = (position + 1) % enabled.length
			} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
				position = (position - 1 + enabled.length) % enabled.length
			} else if (event.key === 'Home') {
				position = 0
			} else if (event.key === 'End') {
				position = enabled.length - 1
			} else {
				return
			}
			event.preventDefault()
			const target = enabled[position]
			this.select(target.option)
			if (buttons[target.index] && typeof buttons[target.index].focus === 'function') {
				buttons[target.index].focus()
			}
		},
	},
}
</script>

<style scoped>
.cn-segmented-control {
	display: inline-flex;
	gap: 4px;
	max-width: 100%;
	padding: 4px;
	border-radius: var(--border-radius-container, var(--border-radius-large, 10px));
	background-color: var(--color-background-dark);
	overflow-x: auto;
}

.cn-segmented-control--stretch {
	display: flex;
}

.cn-segmented-control--stretch .cn-segmented-control__option {
	flex: 1 1 0;
}

/* The parent class outscores Nextcloud's server rule that gives every plain
   `button` a margin and a border. */
.cn-segmented-control .cn-segmented-control__option {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	box-sizing: border-box;
	min-height: 36px;
	margin: 0;
	padding: 0 16px;
	border: 1px solid transparent;
	border-radius: var(--border-radius-element, var(--border-radius-large, 8px));
	background-color: transparent;
	/* Full-contrast label on every option: the choice is carried by the
	   raised surface, not by dimming the others. */
	color: var(--color-main-text);
	font: inherit;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
}

.cn-segmented-control .cn-segmented-control__option:hover {
	background-color: var(--color-background-hover);
}

.cn-segmented-control .cn-segmented-control__option:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* The border survives forced-colours mode, which drops background and shadow. */
.cn-segmented-control .cn-segmented-control__option--checked,
.cn-segmented-control .cn-segmented-control__option--checked:hover {
	border-color: var(--color-border-dark);
	background-color: var(--color-main-background);
	box-shadow: 0 1px 2px var(--color-box-shadow);
}

.cn-segmented-control .cn-segmented-control__option[disabled] {
	cursor: default;
	opacity: 0.5;
}

.cn-segmented-control__count {
	font-weight: 400;
}
</style>
