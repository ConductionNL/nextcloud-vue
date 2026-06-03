<template>
	<div class="cn-form-builder" data-testid="cn-form-builder">
		<header v-if="title || description" class="cn-form-builder__header">
			<h3 v-if="title" class="cn-form-builder__title">{{ title }}</h3>
			<p v-if="description" class="cn-form-builder__description">{{ description }}</p>
		</header>

		<div class="cn-form-builder__body">
			<!-- Field-type palette. Click to append. -->
			<aside class="cn-form-builder__palette" data-testid="cn-form-builder-palette">
				<h4 class="cn-form-builder__palette-title">{{ paletteTitle }}</h4>
				<ul class="cn-form-builder__palette-list">
					<li v-for="t in availableTypes"
						:key="t.type"
						class="cn-form-builder__palette-item"
						:data-type="t.type"
						@click="addField(t.type)">
						<span class="cn-form-builder__palette-icon">{{ t.icon || '◦' }}</span>
						{{ t.label }}
					</li>
				</ul>
			</aside>

			<!-- Field list — selectable rows. -->
			<section class="cn-form-builder__fields" data-testid="cn-form-builder-fields">
				<h4 class="cn-form-builder__fields-title">{{ fieldsTitle }}</h4>
				<p v-if="model.length === 0" class="cn-form-builder__empty">
					{{ emptyLabel }}
				</p>
				<ol v-else class="cn-form-builder__fields-list">
					<li v-for="(field, idx) in model"
						:key="field.key || idx"
						class="cn-form-builder__field-row"
						:class="{ 'cn-form-builder__field-row--selected': selectedIndex === idx }"
						@click="selectedIndex = idx">
						<div class="cn-form-builder__field-meta">
							<span class="cn-form-builder__field-key">{{ field.key || untitledKey }}</span>
							<small class="cn-form-builder__field-type">{{ field.type }}</small>
						</div>
						<div class="cn-form-builder__field-actions" @click.stop>
							<button type="button"
								class="cn-form-builder__action"
								:disabled="idx === 0"
								:title="moveUpLabel"
								@click="moveField(idx, -1)">↑</button>
							<button type="button"
								class="cn-form-builder__action"
								:disabled="idx === model.length - 1"
								:title="moveDownLabel"
								@click="moveField(idx, 1)">↓</button>
							<button type="button"
								class="cn-form-builder__action cn-form-builder__action--delete"
								:title="deleteLabel"
								@click="removeField(idx)">×</button>
						</div>
					</li>
				</ol>
			</section>

			<!-- Per-field config panel. -->
			<section class="cn-form-builder__editor" data-testid="cn-form-builder-editor">
				<h4 class="cn-form-builder__editor-title">{{ editorTitle }}</h4>
				<p v-if="selectedField === null" class="cn-form-builder__empty">
					{{ noSelectionLabel }}
				</p>
				<div v-else class="cn-form-builder__editor-body">
					<label class="cn-form-builder__editor-row">
						<span>{{ keyLabel }}</span>
						<input type="text"
							:value="selectedField.key"
							@input="updateSelected('key', $event.target.value)">
					</label>
					<label class="cn-form-builder__editor-row">
						<span>{{ typeLabel }}</span>
						<select :value="selectedField.type"
							@change="updateSelected('type', $event.target.value)">
							<option v-for="t in availableTypes"
								:key="t.type"
								:value="t.type">{{ t.label }}</option>
						</select>
					</label>
					<label class="cn-form-builder__editor-row">
						<span>{{ labelLabel }}</span>
						<input type="text"
							:value="selectedField.label"
							@input="updateSelected('label', $event.target.value)">
					</label>
					<label class="cn-form-builder__editor-row">
						<span>{{ placeholderLabel }}</span>
						<input type="text"
							:value="selectedField.placeholder || ''"
							@input="updateSelected('placeholder', $event.target.value)">
					</label>
					<label class="cn-form-builder__editor-row cn-form-builder__editor-row--inline">
						<input type="checkbox"
							:checked="!!selectedField.required"
							@change="updateSelected('required', $event.target.checked)">
						<span>{{ requiredLabel }}</span>
					</label>
					<label v-if="selectedField.type === 'enum'" class="cn-form-builder__editor-row">
						<span>{{ optionsLabel }}</span>
						<textarea
							:value="(selectedField.options || []).join('\n')"
							rows="4"
							:placeholder="optionsPlaceholder"
							@input="updateSelected('options', $event.target.value.split('\n').map((s) => s.trim()).filter(Boolean))" />
					</label>
				</div>
			</section>
		</div>

		<!-- JSON preview footer. -->
		<details v-if="!hidePreview" class="cn-form-builder__preview">
			<summary>{{ previewTitle }}</summary>
			<pre class="cn-form-builder__preview-json">{{ previewJson }}</pre>
		</details>
	</div>
</template>

<script>
/**
 * Default field-type palette. Consumers extend via the
 * `availableTypes` prop.
 *
 * @type {Array<{type:string,label:string,icon?:string}>}
 */
const DEFAULT_TYPES = Object.freeze([
	{ type: 'string', label: 'Text', icon: 'A' },
	{ type: 'number', label: 'Number', icon: '#' },
	{ type: 'boolean', label: 'Checkbox', icon: '☑' },
	{ type: 'enum', label: 'Choice', icon: '◉' },
	{ type: 'textarea', label: 'Textarea', icon: '¶' },
])

/**
 * CnFormBuilder — Visual form composer with a field-type palette,
 * a reorderable field list, a per-field config panel, and a JSON
 * preview footer. Emits the live `fields[]` array via v-model so
 * consumers can save / preview / render via `CnFormDialog` etc.
 *
 * MVP — drag-drop reorder is deferred; the panel uses up/down
 * buttons in the field row for now. Tracked under `nextcloud-vue#279`.
 *
 * ```vue
 * <CnFormBuilder v-model="fields" @save="onSave" />
 * ```
 */
export default {
	name: 'CnFormBuilder',
	props: {
		/**
		 * Current field list (v-model). Each entry:
		 * `{ key, type, label?, placeholder?, required?, options? }`.
		 *
		 * @type {Array<object>}
		 */
		value: { type: Array, default: () => [] },
		/**
		 * Override / extend the field-type palette.
		 *
		 * @type {Array<{type:string,label:string,icon?:string}>}
		 */
		availableTypes: { type: Array, default: () => DEFAULT_TYPES.slice() },
		/** Optional title. */
		title: { type: String, default: '' },
		/** Optional description. */
		description: { type: String, default: '' },
		/** Hide the JSON preview footer. */
		hidePreview: { type: Boolean, default: false },
		/** Palette column header. */
		paletteTitle: { type: String, default: 'Field types' },
		/** Fields-list column header. */
		fieldsTitle: { type: String, default: 'Fields' },
		/** Editor column header. */
		editorTitle: { type: String, default: 'Field config' },
		/** Preview details summary. */
		previewTitle: { type: String, default: 'Preview JSON' },
		/** Empty-list label. */
		emptyLabel: { type: String, default: 'No fields yet. Click a field type on the left to add one.' },
		/** No-selection editor label. */
		noSelectionLabel: { type: String, default: 'Select a field to edit it.' },
		/** Untitled-field placeholder shown in the row. */
		untitledKey: { type: String, default: '(unnamed)' },
		/** Field-editor label for the "key" input. */
		keyLabel: { type: String, default: 'Key' },
		/** Field-editor label for the "type" selector. */
		typeLabel: { type: String, default: 'Type' },
		/** Field-editor label for the "label" input. */
		labelLabel: { type: String, default: 'Label' },
		/** Field-editor label for the "placeholder" input. */
		placeholderLabel: { type: String, default: 'Placeholder' },
		/** Field-editor label for the "required" toggle. */
		requiredLabel: { type: String, default: 'Required' },
		/** Field-editor label for the "options" textarea (select/multiselect). */
		optionsLabel: { type: String, default: 'Options (one per line)' },
		/** Placeholder shown inside the empty options textarea. */
		optionsPlaceholder: { type: String, default: 'choice 1\nchoice 2' },
		/** Title/aria label for the per-row "move up" icon button. */
		moveUpLabel: { type: String, default: 'Move up' },
		/** Title/aria label for the per-row "move down" icon button. */
		moveDownLabel: { type: String, default: 'Move down' },
		/** Title/aria label for the per-row delete icon button. */
		deleteLabel: { type: String, default: 'Delete' },
	},
	data() {
		return {
			model: [...this.value],
			selectedIndex: -1,
			autoKeyCounter: 1,
		}
	},
	computed: {
		/**
		 * Currently-selected field object, or null.
		 *
		 * @return {object|null}
		 */
		selectedField() {
			if (this.selectedIndex < 0 || this.selectedIndex >= this.model.length) return null
			return this.model[this.selectedIndex]
		},
		/**
		 * JSON preview of the field list.
		 *
		 * @return {string}
		 */
		previewJson() {
			return JSON.stringify(this.model, null, 2)
		},
	},
	watch: {
		value: {
			handler(next) {
				if (Array.isArray(next) && next !== this.model) {
					this.model = [...next]
				}
			},
			deep: true,
		},
	},
	methods: {
		/**
		 * Append a new field of the given type to the list.
		 *
		 * @param {string} type Field type from the palette.
		 * @return {void}
		 */
		addField(type) {
			const key = `field_${this.autoKeyCounter++}`
			const entry = { key, type, label: '', required: false }
			if (type === 'enum') entry.options = []
			this.model = [...this.model, entry]
			this.selectedIndex = this.model.length - 1
			this.emitChange()
		},
		/**
		 * Update a field property on the selected field.
		 *
		 * @param {string} prop Property name.
		 * @param {*} value New value.
		 * @return {void}
		 */
		updateSelected(prop, value) {
			if (this.selectedIndex < 0) return
			const updated = { ...this.model[this.selectedIndex], [prop]: value }
			const next = [...this.model]
			next[this.selectedIndex] = updated
			this.model = next
			this.emitChange()
		},
		/**
		 * Move a field up or down.
		 *
		 * @param {number} idx Current index.
		 * @param {number} dir -1 to move up, +1 to move down.
		 * @return {void}
		 */
		moveField(idx, dir) {
			const target = idx + dir
			if (target < 0 || target >= this.model.length) return
			const next = [...this.model]
			const [field] = next.splice(idx, 1)
			next.splice(target, 0, field)
			this.model = next
			if (this.selectedIndex === idx) this.selectedIndex = target
			else if (this.selectedIndex === target) this.selectedIndex = idx
			this.emitChange()
		},
		/**
		 * Remove a field.
		 *
		 * @param {number} idx Index to remove.
		 * @return {void}
		 */
		removeField(idx) {
			const next = [...this.model]
			next.splice(idx, 1)
			this.model = next
			if (this.selectedIndex === idx) {
				this.selectedIndex = -1
			} else if (this.selectedIndex > idx) {
				this.selectedIndex -= 1
			}
			this.emitChange()
		},
		/**
		 * Programmatic save trigger — emits the current model as a
		 * `@save` event without closing or resetting.
		 *
		 * @return {void}
		 */
		save() {
			/**
			 * @event save Emitted on explicit consumer-triggered
			 *   save (parent renders the action button).
			 * @type {Array<object>}
			 */
			this.$emit('save', [...this.model])
		},
		emitChange() {
			/**
			 * @event input v-model emit.
			 * @type {Array<object>}
			 */
			this.$emit('input', [...this.model])
		},
	},
}
</script>

<style scoped>
.cn-form-builder {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-form-builder__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-form-builder__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-form-builder__body {
	display: grid;
	grid-template-columns: 180px 1fr 1fr;
	gap: 12px;
	min-height: 320px;
}

.cn-form-builder__palette,
.cn-form-builder__fields,
.cn-form-builder__editor {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
	background: var(--color-main-background);
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-form-builder__palette-title,
.cn-form-builder__fields-title,
.cn-form-builder__editor-title {
	margin: 0;
	font-size: 0.95em;
	border-bottom: 1px solid var(--color-border);
	padding-bottom: 4px;
}

.cn-form-builder__palette-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-form-builder__palette-item {
	padding: 6px 8px;
	border: 1px dashed var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.9em;
}

.cn-form-builder__palette-item:hover {
	background: var(--color-background-hover);
	border-color: var(--color-primary-element);
}

.cn-form-builder__palette-icon {
	font-family: monospace;
	font-weight: 600;
	color: var(--color-primary-element);
}

.cn-form-builder__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 8px 0;
}

.cn-form-builder__fields-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-form-builder__field-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-form-builder__field-row:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-form-builder__field-row--selected {
	background: var(--color-primary-element-light);
}

.cn-form-builder__field-meta {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-form-builder__field-key {
	font-weight: 500;
	font-family: monospace;
}

.cn-form-builder__field-type {
	color: var(--color-text-maxcontrast);
}

.cn-form-builder__field-actions {
	display: flex;
	gap: 2px;
}

.cn-form-builder__action {
	background: none;
	border: 1px solid var(--color-border);
	padding: 2px 6px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-form-builder__action--delete {
	color: var(--color-error);
}

.cn-form-builder__action:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.cn-form-builder__editor-row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 0.9em;
}

.cn-form-builder__editor-row--inline {
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.cn-form-builder__editor-row input[type="text"],
.cn-form-builder__editor-row select,
.cn-form-builder__editor-row textarea {
	padding: 4px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	font-size: 1em;
}

.cn-form-builder__preview {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
	background: var(--color-background-hover);
}

.cn-form-builder__preview summary {
	cursor: pointer;
	font-weight: 500;
}

.cn-form-builder__preview-json {
	margin: 8px 0 0;
	font-size: 0.85em;
	max-height: 240px;
	overflow: auto;
}
</style>
