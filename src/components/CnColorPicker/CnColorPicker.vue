<template>
	<NcPopover
		:shown.sync="open"
		:disabled="disabled"
		:triggers="[]"
		popup-role="dialog"
		popover-base-class="cn-color-picker__popper">
		<template #trigger>
			<button
				type="button"
				class="cn-color-picker__swatch"
				:class="{ 'cn-color-picker__swatch--disabled': disabled }"
				:style="swatchStyle"
				:disabled="disabled"
				:title="t('nextcloud-vue', 'Open color picker')"
				:aria-label="t('nextcloud-vue', 'Open color picker')"
				@click="open = !open" />
		</template>
		<ChromeColorPicker
			ref="picker"
			v-bind="$attrs"
			class="cn-color-picker__chrome"
			:class="{ 'cn-color-picker__chrome--locked-mode': mode !== null }"
			:value="value"
			v-on="$listeners" />
	</NcPopover>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcPopover } from '@nextcloud/vue'
import { Chrome as ChromeColorPicker } from 'vue-color'

/**
 * CnColorPicker — A swatch-button trigger that opens a themed `Chrome` color
 * picker (vue-color) inside a popover.
 *
 * The active color is shown as a square swatch (with a checker pattern behind
 * it so alpha colors render correctly). Clicking the swatch toggles the
 * popover. All props and listeners except `value` and `disabled` are
 * forwarded to the underlying `Chrome` picker, so the full vue-color API
 * stays available (`disable-alpha`, `disable-fields`, `@input`, etc.).
 *
 * The `value` prop accepts any of vue-color's color formats: a CSS color
 * string (`'#abcdef'`, `'rgba(...)'`, ...) or a color object.
 *
 * @event input Forwarded from `Chrome`. Payload: vue-color color object
 *              `{ hex, hex8, rgba, hsl, hsv, a, source }`.
 */
export default {
	name: 'CnColorPicker',

	components: {
		NcPopover,
		ChromeColorPicker,
	},

	inheritAttrs: false,

	props: {
		/**
		 * Current color. Accepts any of vue-color's input formats: CSS color
		 * string or color object. `null`/empty renders a transparent swatch.
		 */
		value: {
			type: [String, Object],
			default: null,
		},
		/** Disables the swatch trigger and prevents the popover from opening. */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Lock the picker's numeric input fields to a single mode and hide the
		 * mode-toggle button. One of `'hex'`, `'rgb'`, `'hsl'`. When `null`
		 * (default) the user can switch modes themselves. The actual fields
		 * shown for `'rgb'`/`'hsl'` include alpha when `disable-alpha` is
		 * `false` (i.e. they become RGBA / HSLA).
		 */
		mode: {
			type: String,
			default: null,
			validator: (v) => v === null || ['hex', 'rgb', 'hsl'].includes(v),
		},
	},

	data() {
		return {
			open: false,
		}
	},

	computed: {
		/**
		 * CSS background for the swatch. Layers a solid color over a checker
		 * pattern so alpha values are visible. Falls back to just the checker
		 * when no value is set.
		 */
		swatchStyle() {
			const c = typeof this.value === 'string'
				? this.value
				: (this.value?.hex8 || this.value?.hex)
			if (!c) return {}
			// Layer the solid fill on top of the four-gradient checker. Each
			// checker layer needs its own offset so the squares alternate; if
			// they all share `0 0` the pattern collapses to a single square.
			const fill = `linear-gradient(${c}, ${c})`
			return {
				backgroundImage: `${fill}, var(--cn-color-picker-checker)`,
				backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
				backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0',
			}
		},
	},

	watch: {
		mode: {
			immediate: true,
			handler() {
				// Wait for the picker ref to exist (initial mount + when the
				// popover first renders the picker).
				this.$nextTick(() => this.applyMode())
			},
		},
		open(isOpen) {
			// Re-apply on every open: vue-color resets `fieldsIndex` if the
			// component is unmounted/remounted by the popover.
			if (isOpen) this.$nextTick(() => this.applyMode())
		},
	},

	methods: {
		t,

		/** Pin the Chrome picker's `fieldsIndex` to the requested mode. */
		applyMode() {
			if (!this.mode) return
			const idx = { hex: 0, rgb: 1, hsl: 2 }[this.mode]
			const picker = this.$refs.picker
			if (picker && picker.fieldsIndex !== idx) {
				picker.fieldsIndex = idx
			}
		},
	},
}
</script>

<style scoped>
.cn-color-picker__swatch {
	--cn-color-picker-checker:
		linear-gradient(45deg, var(--color-background-dark) 25%, transparent 25%),
		linear-gradient(-45deg, var(--color-background-dark) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, var(--color-background-dark) 75%),
		linear-gradient(-45deg, transparent 75%, var(--color-background-dark) 75%);
	display: inline-block;
	width: 32px;
	height: 32px;
	flex-shrink: 0;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background-image: var(--cn-color-picker-checker);
	background-size: 8px 8px;
	background-position: 0 0, 0 4px, 4px -4px, -4px 0;
	overflow: hidden;
	position: relative;
}

.cn-color-picker__swatch:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-color-picker__swatch--disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

/* Strip Chrome's hardcoded light-mode palette so it adopts the active theme.
   The class lands on the picker's root via Vue's class merging, so target it
   directly — NOT as a descendant. */
.cn-color-picker__chrome {
	background: var(--color-main-background);
	background-color: var(--color-main-background);
	box-shadow: none;
	color: var(--color-main-text);
	font-family: var(--font-face);
	overflow: hidden;
}

.cn-color-picker__chrome :deep(.vc-chrome-body),
.cn-color-picker__chrome :deep(.vc-chrome-saturation-wrap),
.cn-color-picker__chrome :deep(.vc-chrome-color-wrap),
.cn-color-picker__chrome :deep(.vc-chrome-active-color) {
	background-color: var(--color-main-background);
}

.cn-color-picker__chrome :deep(.vc-chrome-toggle-icon-highlight) {
	background: var(--color-background-hover);
}

.cn-color-picker__chrome :deep(.vc-hue-picker),
.cn-color-picker__chrome :deep(.vc-alpha-picker) {
	background-color: var(--color-main-background);
	box-shadow: 0 1px 4px 0 var(--color-box-shadow);
}

.cn-color-picker__chrome :deep(.vc-chrome-fields .vc-input__input) {
	background-color: var(--color-main-background);
	color: var(--color-main-text);
	box-shadow: inset 0 0 0 1px var(--color-border);
}

.cn-color-picker__chrome :deep(.vc-chrome-fields .vc-input__label) {
	color: var(--color-text-maxcontrast);
}

.cn-color-picker__chrome :deep(.vc-chrome-toggle-icon svg path) {
	fill: var(--color-main-text);
}

/* When `mode` is set, lock the field-mode toggle so the user can't switch
   between hex/rgb/hsl. */
.cn-color-picker__chrome--locked-mode :deep(.vc-chrome-toggle-btn) {
	display: none;
}
</style>

<!-- Non-scoped overrides: NcPopover renders into a portal at document.body,
     so scoped styles can't reach it. Targeted by `popoverBaseClass`. -->
<style>
.cn-color-picker__popper .v-popper__inner,
.cn-color-picker__popper .v-popper__wrapper {
	background: var(--color-main-background);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-color-picker__popper .v-popper__arrow-inner,
.cn-color-picker__popper .v-popper__arrow-outer {
	border-color: var(--color-main-background);
}

/* Default NcPopover style sets `top: -9px` with specificity (0,4,1) using a
   hashed class name; bump with !important rather than depend on the hash. */
.cn-color-picker__popper .v-popper__arrow-container {
	top: -10px !important;
}
</style>
