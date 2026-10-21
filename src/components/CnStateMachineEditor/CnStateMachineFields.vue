<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-sm-fields" :class="{ 'cn-sm-fields--row': row }">
		<template v-for="(field, fieldIndex) in fields" :key="field.key || `${field.type}-${fieldIndex}`">
			<!-- One line of fields side by side. -->
			<CnStateMachineFields
				v-if="field.type === 'row'"
				:fields="field.fields"
				:target="target"
				:path="path"
				:disabled="isDisabled(field)"
				row />

			<!-- A group: collapsible, switchable, or a nested object. -->
			<div v-else-if="field.type === 'group'" class="cn-sm-group" :class="{ 'cn-sm-group--section': field.section }">
				<button
					v-if="field.collapsible"
					type="button"
					class="cn-sm-group__toggle"
					:aria-expanded="isOpen(field) ? 'true' : 'false'"
					:aria-controls="idFor(field, 'body')"
					@click="toggleOpen(field)">
					<span>{{ panel.tr(field.label) }}</span>
					<ChevronDown v-if="isOpen(field)" :size="18" />
					<ChevronRight v-else :size="18" />
				</button>
				<h4 v-else-if="field.label && !field.optional" class="cn-sm-group__heading">
					{{ panel.tr(field.label) }}
				</h4>

				<p v-if="field.lockable && panel.locked && field.lockedNotice" class="cn-sm-group__notice" role="note">
					{{ panel.tr(field.lockedNotice) }}
				</p>

				<div v-if="!field.collapsible || isOpen(field)" :id="idFor(field, 'body')" class="cn-sm-group__body">
					<div v-if="field.optional" class="cn-sm-field cn-sm-field--check">
						<input
							:id="idFor(field, 'enabled')"
							type="checkbox"
							:checked="panel.isEnabled(childPath(field))"
							:disabled="isDisabled(field)"
							@change="panel.setEnabled(childPath(field), $event.target.checked)">
						<label :for="idFor(field, 'enabled')">{{ panel.tr(field.toggleLabel || field.label) }}</label>
					</div>
					<CnStateMachineFields
						v-if="!field.optional || panel.isEnabled(childPath(field))"
						:class="{ 'cn-sm-fields--boxed': field.optional }"
						:fields="field.fields"
						:target="field.key ? target[field.key] : target"
						:path="childPath(field)"
						:disabled="isDisabled(field)" />
				</div>
			</div>

			<!-- A list of strings or of objects with one edited text. -->
			<fieldset v-else-if="field.type === 'list'" class="cn-sm-list" :class="{ 'cn-sm-list--section': field.section }">
				<legend class="cn-sm-field__label" :class="{ 'cn-sm-list__legend--section': field.section }">
					{{ panel.tr(field.label) }}
				</legend>
				<div
					v-for="(item, index) in target[field.key]"
					:key="itemKey(field, item, index)"
					class="cn-sm-list__item"
					:draggable="field.reorderable && !isDisabled(field) ? 'true' : 'false'"
					@dragstart="onItemDragStart(field, index, $event)"
					@dragover.prevent
					@drop.stop.prevent="onItemDrop(field, index)">
					<span v-if="field.reorderable" class="cn-sm-list__handle" aria-hidden="true">
						<DragVertical :size="16" />
					</span>
					<input
						type="text"
						class="cn-sm-field__input"
						:value="itemText(field, item)"
						:placeholder="field.itemLabel ? panel.tr(field.itemLabel) : ''"
						:aria-label="itemAriaLabel(field, index)"
						:disabled="isDisabled(field)"
						@input="setItemText(field, index, $event.target.value)">
					<template v-if="field.reorderable">
						<NcButton
							variant="tertiary"
							:disabled="isDisabled(field) || index === 0"
							:aria-label="moveLabel(field, index, 'up')"
							@click="move(field, index, index - 1)">
							<template #icon>
								<ArrowUp :size="16" />
							</template>
						</NcButton>
						<NcButton
							variant="tertiary"
							:disabled="isDisabled(field) || index === target[field.key].length - 1"
							:aria-label="moveLabel(field, index, 'down')"
							@click="move(field, index, index + 1)">
							<template #icon>
								<ArrowDown :size="16" />
							</template>
						</NcButton>
					</template>
					<NcButton
						variant="tertiary"
						:disabled="isDisabled(field)"
						:aria-label="removeLabel(field, index)"
						@click="removeItem(field, index)">
						<template #icon>
							<Close :size="16" />
						</template>
					</NcButton>
				</div>
				<NcButton variant="secondary" :disabled="isDisabled(field)" @click="addItem(field)">
					{{ panel.tr(field.addLabel) || t('nextcloud-vue', 'Add') }}
				</NcButton>
			</fieldset>

			<!-- A list of objects whose fields depend on their type. -->
			<fieldset v-else-if="field.type === 'typed-list'" class="cn-sm-list" :class="{ 'cn-sm-list--section': field.section }">
				<legend class="cn-sm-field__label" :class="{ 'cn-sm-list__legend--section': field.section }">
					{{ panel.tr(field.label) }}
				</legend>
				<div
					v-for="(item, index) in target[field.key]"
					:key="itemKey(field, item, index)"
					class="cn-sm-list__typed">
					<div class="cn-sm-field">
						<label :for="idFor(field, `type-${index}`)" class="cn-sm-field__label">
							{{ field.typeLabel ? panel.tr(field.typeLabel) : t('nextcloud-vue', 'Type') }}
						</label>
						<select
							:id="idFor(field, `type-${index}`)"
							class="cn-sm-field__input"
							:value="item[typeKey(field)]"
							:disabled="isDisabled(field)"
							@change="panel.set(item, typeKey(field), $event.target.value)">
							<option
								v-for="type in typesFor(field, item)"
								:key="type.value"
								:value="type.value">
								{{ panel.tr(type.label) }}
							</option>
						</select>
					</div>
					<CnStateMachineFields
						:fields="fieldsOfType(field, item)"
						:target="item"
						:path="`${childPath(field)}.${index}`"
						:disabled="isDisabled(field)" />
					<NcButton
						variant="tertiary"
						class="cn-sm-list__remove"
						:disabled="isDisabled(field)"
						:aria-label="panel.tr(field.removeLabel) || t('nextcloud-vue', 'Remove')"
						@click="removeItem(field, index)">
						<template #icon>
							<Close :size="16" />
						</template>
					</NcButton>
				</div>
				<NcButton variant="secondary" :disabled="isDisabled(field)" @click="addItem(field)">
					{{ panel.tr(field.addLabel) || t('nextcloud-vue', 'Add') }}
				</NcButton>
			</fieldset>

			<!-- Several values picked from a set of options. -->
			<fieldset v-else-if="field.type === 'checkboxes'" class="cn-sm-list">
				<legend class="cn-sm-field__label">
					{{ panel.tr(field.label) }}
				</legend>
				<div v-for="(option, index) in panel.optionsOf(field)" :key="String(option.value)" class="cn-sm-field cn-sm-field--check">
					<input
						:id="idFor(field, `option-${index}`)"
						type="checkbox"
						:checked="(target[field.key] || []).includes(option.value)"
						:disabled="isDisabled(field)"
						@change="toggleOption(field, option.value)">
					<label :for="idFor(field, `option-${index}`)">{{ option.label }}</label>
				</div>
			</fieldset>

			<!-- A single check box. -->
			<div v-else-if="field.type === 'checkbox'" class="cn-sm-field cn-sm-field--check">
				<input
					:id="idFor(field)"
					type="checkbox"
					:checked="!!target[field.key]"
					:disabled="isDisabled(field)"
					@change="panel.set(target, field.key, $event.target.checked)">
				<label :for="idFor(field)">{{ panel.tr(field.label) }}</label>
			</div>

			<!-- One value from a set of options. -->
			<div v-else-if="field.type === 'select'" class="cn-sm-field" :class="widthClass(field)">
				<label :for="idFor(field)" class="cn-sm-field__label" :class="{ 'cn-sm-visually-hidden': field.hideLabel }">
					{{ panel.tr(field.label) }}
				</label>
				<select
					:id="idFor(field)"
					class="cn-sm-field__input"
					:disabled="isDisabled(field)"
					@change="onSelect(field, $event.target.value)">
					<option
						v-for="(option, index) in selectOptions(field)"
						:key="index"
						:value="String(index)"
						:selected="sameValue(option.value, target[field.key])">
						{{ option.label }}
					</option>
				</select>
			</div>

			<!-- Free text, a longer text, or a number. -->
			<div v-else class="cn-sm-field" :class="widthClass(field)">
				<label :for="idFor(field)" class="cn-sm-field__label" :class="{ 'cn-sm-visually-hidden': field.hideLabel }">
					{{ panel.tr(field.label) }}
				</label>
				<textarea
					v-if="field.type === 'textarea'"
					:id="idFor(field)"
					class="cn-sm-field__input"
					:rows="field.rows || 3"
					:value="target[field.key] ?? ''"
					:placeholder="field.placeholder ? panel.tr(field.placeholder) : ''"
					:aria-describedby="field.hint ? idFor(field, 'hint') : undefined"
					:disabled="isDisabled(field)"
					@input="panel.set(target, field.key, $event.target.value)" />
				<input
					v-else
					:id="idFor(field)"
					class="cn-sm-field__input"
					:type="field.type === 'number' ? 'number' : (field.inputType || 'text')"
					:min="field.min"
					:max="field.max"
					:value="target[field.key] ?? ''"
					:placeholder="field.placeholder ? panel.tr(field.placeholder) : ''"
					:aria-describedby="field.hint ? idFor(field, 'hint') : undefined"
					:disabled="isDisabled(field)"
					@input="onInput(field, $event.target.value)">
				<p v-if="field.hint" :id="idFor(field, 'hint')" class="cn-sm-field__hint">
					{{ panel.tr(field.hint) }}
				</p>
			</div>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Close from 'vue-material-design-icons/Close.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import { newListItem } from './stateMachineFields.js'

/**
 * Renders field descriptors against one object of a property panel's copy.
 *
 * Every write goes through the panel's injected `set`, so the panel owns the
 * copy and hears each change. Recursive for groups, rows and typed lists.
 */
export default {
	name: 'CnStateMachineFields',

	components: { NcButton, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Close, DragVertical },

	inject: ['cnStateMachinePanel'],

	props: {
		/** The field descriptors to render. */
		fields: {
			type: Array,
			default: () => [],
		},

		/** The object of the panel's copy these fields edit. */
		target: {
			type: Object,
			required: true,
		},

		/** Where `target` sits in the copy, for ids and optional-group state. */
		path: {
			type: String,
			default: '',
		},

		/** Disable every control. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** Lay the fields out on one line. */
		row: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			open: {},
			dragIndex: null,
			dragKey: null,
		}
	},

	computed: {
		/**
		 * @return {object} The owning panel's API.
		 */
		panel() {
			return this.cnStateMachinePanel
		},
	},

	methods: {
		t,

		/**
		 * @param {object} field A descriptor.
		 * @return {boolean} Whether its controls are disabled.
		 */
		isDisabled(field) {
			return this.disabled || (field.lockable === true && this.panel.locked === true)
		},

		/**
		 * @param {object} field A descriptor.
		 * @return {string} The path of the object a group or list edits.
		 */
		childPath(field) {
			if (!field.key) {
				return this.path
			}
			return this.path ? `${this.path}.${field.key}` : field.key
		},

		/**
		 * @param {object} field A descriptor.
		 * @param {string} [suffix] A part name.
		 * @return {string} A DOM id unique within the editor.
		 */
		idFor(field, suffix = '') {
			const raw = [this.panel.uid, this.childPath(field) || field.type, suffix].filter(Boolean).join('-')
			return raw.replace(/[^A-Za-z0-9_-]/g, '-')
		},

		/**
		 * @param {object} field A descriptor.
		 * @return {string|null} The width modifier class.
		 */
		widthClass(field) {
			return field.width === 'narrow' ? 'cn-sm-field--narrow' : null
		},

		/**
		 * @param {object} field A collapsible group.
		 * @return {boolean} Whether it is open.
		 */
		isOpen(field) {
			const key = this.childPath(field) || field.label
			return this.open[key] ?? field.open === true
		},

		/**
		 * @param {object} field A collapsible group.
		 * @return {void}
		 */
		toggleOpen(field) {
			const key = this.childPath(field) || field.label
			this.open = { ...this.open, [key]: !this.isOpen(field) }
		},

		/**
		 * @param {object} field A text or number descriptor.
		 * @param {string} raw The input's value.
		 * @return {void}
		 */
		onInput(field, raw) {
			if (field.type === 'number') {
				this.panel.set(this.target, field.key, raw === '' ? null : Number(raw))
				return
			}
			this.panel.set(this.target, field.key, raw)
		},

		/**
		 * @param {object} field A select descriptor.
		 * @return {Array<object>} Its options, the empty option first.
		 */
		selectOptions(field) {
			const options = this.panel.optionsOf(field)
			if (field.emptyOption) {
				return [{ value: field.emptyOption.value ?? null, label: this.panel.tr(field.emptyOption.label || '') }, ...options]
			}
			return options
		},

		/**
		 * @param {unknown} a One value.
		 * @param {unknown} b Another.
		 * @return {boolean} Whether they are the same option, treating null and undefined alike.
		 */
		sameValue(a, b) {
			return (a ?? null) === (b ?? null)
		},

		/**
		 * @param {object} field A select descriptor.
		 * @param {string} index The chosen option's index.
		 * @return {void}
		 */
		onSelect(field, index) {
			const option = this.selectOptions(field)[Number(index)]
			this.panel.set(this.target, field.key, option ? option.value : null)
		},

		/**
		 * @param {object} field A checkboxes descriptor.
		 * @param {unknown} value The option toggled.
		 * @return {void}
		 */
		toggleOption(field, value) {
			const current = [...(this.target[field.key] || [])]
			const at = current.indexOf(value)
			if (at >= 0) {
				current.splice(at, 1)
			} else {
				current.push(value)
			}
			this.panel.set(this.target, field.key, current)
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {unknown} item An entry.
		 * @param {number} index Its index.
		 * @return {string} A stable key for the entry.
		 */
		itemKey(field, item, index) {
			if (field.idKey && item && typeof item === 'object' && item[field.idKey] !== undefined) {
				return String(item[field.idKey])
			}
			return `${field.key}-${index}`
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {unknown} item An entry.
		 * @return {string} The text the entry's input shows.
		 */
		itemText(field, item) {
			if (field.itemType === 'object') {
				return (item && item[field.itemKey || 'label']) ?? ''
			}
			return item ?? ''
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry.
		 * @param {string} value The new text.
		 * @return {void}
		 */
		setItemText(field, index, value) {
			const list = this.target[field.key]
			if (field.itemType === 'object') {
				this.panel.set(list[index], field.itemKey || 'label', value)
				return
			}
			this.panel.set(list, index, value)
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry.
		 * @return {string} The entry input's accessible name.
		 */
		itemAriaLabel(field, index) {
			const label = this.panel.tr(field.itemLabel || field.label)
			return this.target[field.key].length > 1 ? `${label} ${index + 1}` : label
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry.
		 * @return {string} The remove button's accessible name.
		 */
		removeLabel(field, index) {
			const label = this.panel.tr(field.removeLabel) || t('nextcloud-vue', 'Remove')
			return this.target[field.key].length > 1 ? `${label} ${index + 1}` : label
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry.
		 * @param {string} direction `up` or `down`.
		 * @return {string} The move button's accessible name.
		 */
		moveLabel(field, index, direction) {
			const label = direction === 'up' ? t('nextcloud-vue', 'Move up') : t('nextcloud-vue', 'Move down')
			return `${label}: ${this.itemText(field, this.target[field.key][index]) || index + 1}`
		},

		/**
		 * @param {object} field A list descriptor.
		 * @return {void}
		 */
		addItem(field) {
			this.panel.push(this.target[field.key], newListItem(field))
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry.
		 * @return {void}
		 */
		removeItem(field, index) {
			this.panel.splice(this.target[field.key], index)
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} from The entry's index.
		 * @param {number} to Its new index.
		 * @return {void}
		 */
		move(field, from, to) {
			this.panel.move(this.target[field.key], from, to)
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The dragged entry.
		 * @param {DragEvent} event The drag event.
		 * @return {void}
		 */
		onItemDragStart(field, index, event) {
			if (!field.reorderable || this.isDisabled(field)) {
				return
			}
			this.dragIndex = index
			this.dragKey = field.key
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', String(index))
			}
		},

		/**
		 * @param {object} field A list descriptor.
		 * @param {number} index The entry dropped on.
		 * @return {void}
		 */
		onItemDrop(field, index) {
			if (this.dragKey === field.key && this.dragIndex !== null) {
				this.move(field, this.dragIndex, index)
			}
			this.dragIndex = null
			this.dragKey = null
		},

		/**
		 * @param {object} field A typed-list descriptor.
		 * @return {string} The key holding an entry's type.
		 */
		typeKey(field) {
			return field.typeKey || 'type'
		},

		/**
		 * The types an entry can be set to: the offered ones, plus its own when
		 * that is one no longer offered, so a stored entry still shows what it is.
		 *
		 * @param {object} field A typed-list descriptor.
		 * @param {object} item The entry.
		 * @return {Array<object>} The types.
		 */
		typesFor(field, item) {
			const own = item[this.typeKey(field)]
			return (field.types || []).filter((type) => !type.hidden || type.value === own)
		},

		/**
		 * @param {object} field A typed-list descriptor.
		 * @param {object} item The entry.
		 * @return {Array<object>} The fields of the entry's type.
		 */
		fieldsOfType(field, item) {
			const type = (field.types || []).find((candidate) => candidate.value === item[this.typeKey(field)])
			return type && Array.isArray(type.fields) ? type.fields : []
		},
	},
}
</script>

<style scoped>
.cn-sm-fields {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.cn-sm-fields--row {
	flex-direction: row;
	align-items: flex-end;
	gap: 8px;
}

.cn-sm-fields--row > * {
	flex: 1 1 0;
	min-width: 0;
}

.cn-sm-fields--row > .cn-sm-field--narrow {
	flex: 0 0 88px;
}

.cn-sm-fields--boxed {
	padding: 8px;
	border-radius: var(--border-radius, 8px);
	background: var(--color-background-dark, #ededed);
}

.cn-sm-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-sm-field--check {
	flex-direction: row;
	align-items: center;
	gap: 8px;
}

.cn-sm-field__label,
.cn-sm-field > label {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text, #222);
}

.cn-sm-field--check > label {
	font-weight: 400;
}

.cn-sm-field__input {
	width: 100%;
	min-height: 36px;
	box-sizing: border-box;
	padding: 6px 8px;
	border: 1px solid var(--color-border-maxcontrast, #7f7f7f);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background, #fff);
	color: var(--color-main-text, #222);
	font: inherit;
}

textarea.cn-sm-field__input {
	resize: vertical;
}

.cn-sm-field__input:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 1px;
}

.cn-sm-field__hint {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast, #6b6b6b);
}

.cn-sm-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-sm-list--section,
.cn-sm-group--section {
	padding-top: 12px;
	border-top: 1px solid var(--color-border, #d0d0d0);
}

.cn-sm-list legend {
	padding: 0;
	margin-bottom: 6px;
}

.cn-sm-list__legend--section,
.cn-sm-group__heading {
	margin: 0 0 6px;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-text-maxcontrast, #6b6b6b);
}

.cn-sm-list__item {
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-sm-list__handle {
	display: inline-flex;
	cursor: grab;
	color: var(--color-text-maxcontrast, #6b6b6b);
}

.cn-sm-list__typed {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 44px 8px 8px;
	border-radius: var(--border-radius, 8px);
	background: var(--color-background-dark, #ededed);
}

.cn-sm-list__remove {
	position: absolute;
	top: 4px;
	inset-inline-end: 4px;
}

.cn-sm-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-sm-group__toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	min-height: 34px;
	padding: 4px 0;
	border: 0;
	background: none;
	color: var(--color-text-maxcontrast, #6b6b6b);
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	cursor: pointer;
}

.cn-sm-group__toggle:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: 2px;
}

.cn-sm-group__notice {
	margin: 0;
	padding: 8px;
	border-inline-start: 4px solid var(--color-warning, #c28900);
	border-radius: var(--border-radius, 8px);
	background: var(--color-background-dark, #ededed);
	font-size: 13px;
}

.cn-sm-group__body {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-sm-visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
