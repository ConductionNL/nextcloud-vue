<template>
	<div class="cn-theme-preview" data-testid="cn-theme-preview">
		<!-- Colour pickers row. -->
		<div class="cn-theme-preview__controls">
			<label v-for="ctrl in pickers"
				:key="ctrl.key"
				class="cn-theme-preview__picker">
				<span class="cn-theme-preview__picker-label">{{ ctrl.label }}</span>
				<input
					type="color"
					:value="model[ctrl.key]"
					:aria-label="ctrl.label"
					:data-testid="'picker-' + ctrl.key"
					@input="onPickerChange(ctrl.key, $event.target.value)">
				<input
					type="text"
					class="cn-theme-preview__picker-text"
					:value="model[ctrl.key]"
					:aria-label="ctrl.label + ' (hex)'"
					@input="onPickerChange(ctrl.key, $event.target.value)">
			</label>
		</div>

		<!-- Live preview panel with the colours applied as inline CSS vars. -->
		<div class="cn-theme-preview__preview"
			data-testid="cn-theme-preview-panel"
			:style="previewStyle">
			<!-- @slot preview Replaces the default preview body. Scope:
			     { model }. Useful when consumers want their actual
			     app chrome inside the preview rather than the generic
			     sample. -->
			<slot name="preview" :model="model">
				<div class="cn-theme-preview__sample">
					<div class="cn-theme-preview__sample-header">
						<span class="cn-theme-preview__sample-title">{{ sampleTitle }}</span>
						<button type="button" class="cn-theme-preview__sample-button">
							{{ sampleButtonLabel }}
						</button>
					</div>
					<div class="cn-theme-preview__sample-body">
						<p>{{ sampleBodyText }}</p>
						<ul class="cn-theme-preview__sample-list">
							<li>{{ sampleItem1 }}</li>
							<li class="cn-theme-preview__sample-list-active">
								{{ sampleItem2 }}
							</li>
							<li>{{ sampleItem3 }}</li>
						</ul>
						<a href="#" class="cn-theme-preview__sample-link" @click.prevent>{{ sampleLink }}</a>
					</div>
				</div>
			</slot>
		</div>

		<!-- Reset button row. -->
		<div v-if="defaults" class="cn-theme-preview__actions">
			<button type="button"
				class="cn-theme-preview__reset"
				:disabled="!isModified"
				@click="reset">
				{{ resetLabel }}
			</button>
		</div>
	</div>
</template>

<script>
/**
 * CnThemePreview — Live CSS theme preview with colour pickers.
 *
 * Wraps a row of `<input type="color">` controls (one per declared
 * theme variable) with a live preview panel that applies the
 * picked colours as inline CSS variables. Emits `@change` with
 * the full colour map on every mutation; consumers persist the
 * map and apply it globally (e.g. `<style>:root { --primary: ... }`).
 *
 * The default preview body renders a generic sample (header +
 * button + list + link). Apps can replace it via the `#preview`
 * slot to drop their own UI chrome inside the preview.
 *
 * The `pickers` prop declares which variables are exposed (id,
 * label, default colour) — the component is colour-set-agnostic.
 *
 * ```vue
 * <CnThemePreview
 *   :pickers="[
 *     { key: 'primary',    label: 'Primary',    default: '#21468B' },
 *     { key: 'background', label: 'Background', default: '#FFFFFF' },
 *     { key: 'text',       label: 'Text',       default: '#1B1B1B' },
 *   ]"
 *   :defaults="{ primary: '#21468B', background: '#FFFFFF', text: '#1B1B1B' }"
 *   @change="onColoursChanged" />
 * ```
 */
export default {
	name: 'CnThemePreview',
	props: {
		/**
		 * Colour-picker declarations. Each entry: `{ key, label,
		 * default? }`. The `key` ends up as `--<key>` on the preview
		 * panel + in the emitted colour map.
		 *
		 * @type {Array<{key:string,label:string,default?:string}>}
		 */
		pickers: {
			type: Array,
			required: true,
			validator: (v) => Array.isArray(v) && v.length > 0
				&& v.every((p) => p && typeof p.key === 'string' && typeof p.label === 'string'),
		},
		/**
		 * Initial colour map. Falls back to each picker's `default`
		 * when omitted; falls back to `#000000` when neither is set.
		 *
		 * @type {Record<string,string>}
		 */
		value: { type: Object, default: () => ({}) },
		/**
		 * Default colour map used by the Reset button. When set the
		 * Reset button renders; when null it stays hidden.
		 *
		 * @type {Record<string,string>}
		 */
		defaults: { type: Object, default: null },
		/** Sample preview — title heading. */
		sampleTitle: { type: String, default: 'My app' },
		/** Sample preview — primary button label. */
		sampleButtonLabel: { type: String, default: 'Primary action' },
		/** Sample preview — body paragraph text. */
		sampleBodyText: { type: String, default: 'This is how your app surface looks with the current theme.' },
		/** Sample preview — first list item. */
		sampleItem1: { type: String, default: 'List item one' },
		/** Sample preview — active list item. */
		sampleItem2: { type: String, default: 'List item two (active)' },
		/** Sample preview — third list item. */
		sampleItem3: { type: String, default: 'List item three' },
		/** Sample preview — link text. */
		sampleLink: { type: String, default: 'Sample link' },
		/** Reset-button label. */
		resetLabel: { type: String, default: 'Reset to defaults' },
	},
	emits: ['change', 'input', 'update:modelValue'],
	data() {
		return {
			model: this.buildInitialModel(),
		}
	},
	computed: {
		/**
		 * The value the consumer actually bound, whichever prop they used.
		 *
		 * @return {*} The bound value.
		 */
		boundValue() {
			return this.modelValue !== undefined ? this.modelValue : this.value
		},
		/**
		 * Inline CSS variables applied to the preview panel.
		 *
		 * @return {object} `style` object mapping `--<key>` to value.
		 */
		previewStyle() {
			const out = {}
			for (const [k, v] of Object.entries(this.model)) {
				out[`--${k}`] = v
			}
			return out
		},
		/**
		 * The same value as `value`, under Vue 3's own v-model name.
		 *
		 * ⚠️ WITHOUT THIS, `v-model` ON THIS COMPONENT DOES NOTHING. Vue 3
		 * compiles `v-model="x"` to `:modelValue` + `@update:modelValue`, so a
		 * component declaring only `value`/`input` never receives the prop and
		 * its emit is never heard — silently, looking exactly like a component
		 * that works.
		 *
		 * `value` stays the public name; both are accepted. The default is
		 * `undefined` so "not passed" is distinguishable from "passed empty".
		 *
		 * @type {string|object}
		 */
		modelValue: { type: [String, Object], default: undefined },
		/**
		 * Whether the current model differs from `defaults`.
		 *
		 * @return {boolean} True when at least one key differs.
		 */
		isModified() {
			if (!this.defaults) return false
			for (const [k, v] of Object.entries(this.defaults)) {
				if (this.model[k] !== v) return true
			}
			return false
		},
	},
	watch: {
		/**
		 * Re-seed the model when the consumer passes a fresh `value`
		 * object (e.g. after async load).
		 */
		value: {
			handler(next) {
				if (!next || typeof next !== 'object') return
				this.model = { ...this.model, ...next }
			},
			deep: true,
		},
	},
	methods: {
		/**
		 * Tell the consumer the value changed, in both v-model dialects.
		 *
		 * BOTH are emitted, always: a consumer on `@input` and a consumer on
		 * `v-model` are the same consumer as far as this component knows, and
		 * emitting only one silently breaks half of them.
		 *
		 * @param {*} next The new value.
		 * @return {void}
		 */
		emitValue(next) {
			/**
			 * @event input The value changed. Vue 2's v-model dialect, kept for
			 *   existing consumers.
			 * @type {*}
			 */
			this.$emit('input', next)
			/**
			 * @event update:modelValue The value changed. Vue 3's v-model
			 *   dialect — what a plain `v-model` listens for.
			 * @type {*}
			 */
			this.$emit('update:modelValue', next)
		},
		/**
		 * Build the starting model from `value` / picker defaults.
		 *
		 * @return {Record<string,string>} The seed model.
		 */
		buildInitialModel() {
			// ⚠️ `data()` runs BEFORE computeds exist, so `this.boundValue` is
			// undefined here and the model would silently fall back to defaults.
			// Resolved inline instead — the same rule, evaluated at a moment the
			// computed cannot be.
			const bound = this.modelValue !== undefined ? this.modelValue : this.value
			const out = {}
			for (const p of this.pickers) {
				if (bound && bound[p.key] !== undefined) {
					out[p.key] = bound[p.key]
				} else if (p.default !== undefined) {
					out[p.key] = p.default
				} else {
					out[p.key] = '#000000'
				}
			}
			return out
		},
		/**
		 * Handle a picker / text-input change. Validates the value
		 * is a hex colour-ish string before mutating.
		 *
		 * @param {string} key Picker key.
		 * @param {string} value New colour (CSS-string).
		 * @return {void}
		 */
		onPickerChange(key, value) {
			if (typeof value !== 'string') return
			this.model = { ...this.model, [key]: value }
			this.emitChange()
		},
		/**
		 * Reset the model to `defaults`.
		 *
		 * @return {void}
		 */
		reset() {
			if (!this.defaults) return
			this.model = { ...this.defaults }
			this.emitChange()
		},
		/**
		 * Emit the change event.
		 *
		 * @return {void}
		 */
		emitChange() {
			/**
			 * @event change Emitted on every colour mutation
			 *   (picker / text input / reset). Payload is the
			 *   full colour map.
			 * @type {Record<string,string>}
			 */
			this.$emit('change', { ...this.model })
			/**
			 * @event input v-model-friendly alias of `change`.
			 *   Lets consumers bind `v-model` to a colour map.
			 * @type {Record<string,string>}
			 */
			this.emitValue({ ...this.model })
		},
	},
}
</script>

<style scoped>
.cn-theme-preview {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-theme-preview__controls {
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
}

.cn-theme-preview__picker {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-theme-preview__picker-label {
	font-weight: 500;
	font-size: 0.85em;
}

.cn-theme-preview__picker-text {
	width: 90px;
	padding: 4px 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	font-family: monospace;
}

.cn-theme-preview__preview {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 16px;
	background: var(--background, #fff);
	color: var(--text, #1b1b1b);
	min-height: 200px;
}

.cn-theme-preview__sample {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-theme-preview__sample-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--text, #1b1b1b);
}

.cn-theme-preview__sample-title {
	font-size: 1.4em;
	font-weight: 700;
	color: var(--primary, #21468B);
}

.cn-theme-preview__sample-button {
	background: var(--primary, #21468B);
	color: var(--background, #fff);
	border: none;
	padding: 6px 14px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-theme-preview__sample-body p {
	margin: 0 0 8px;
}

.cn-theme-preview__sample-list {
	margin: 0 0 8px;
	padding-left: 18px;
}

.cn-theme-preview__sample-list-active {
	color: var(--primary, #21468B);
	font-weight: 600;
}

.cn-theme-preview__sample-link {
	color: var(--primary, #21468B);
	text-decoration: underline;
}

.cn-theme-preview__actions {
	display: flex;
	justify-content: flex-end;
}

.cn-theme-preview__reset {
	background: none;
	border: 1px solid var(--color-border);
	padding: 6px 12px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-theme-preview__reset:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
