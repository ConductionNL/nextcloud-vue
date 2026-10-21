<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-block-list-editor" data-testid="cn-block-list-editor">
		<div
			class="cn-block-list-editor__palette"
			role="group"
			:aria-label="addLabel || t('nextcloud-vue', 'Add a block')">
			<span class="cn-block-list-editor__palette-label">{{ addLabel || t('nextcloud-vue', 'Add a block') }}</span>
			<NcButton
				v-for="type in addableTypes"
				:key="type.type"
				variant="secondary"
				draggable="true"
				:disabled="atMax"
				:data-testid="`cn-block-add-${type.type}`"
				@dragstart="onPaletteDragStart($event, type.type)"
				@dragend="onDragEnd"
				@click="add(type.type)">
				{{ type.label }}
			</NcButton>
		</div>

		<ol
			class="cn-block-list-editor__list"
			:aria-label="listLabel || t('nextcloud-vue', 'Blocks')"
			@dragover.prevent="onDragOver(blocks.length)"
			@drop.prevent="onDrop(blocks.length)">
			<li
				v-for="(block, index) in blocks"
				:key="block.id"
				class="cn-block-list-editor__block"
				:class="{
					'cn-block-list-editor__block--selected': selectedId === block.id,
					'cn-block-list-editor__block--over': dropIndex === index,
				}"
				:data-testid="`cn-block-${block.type}`"
				@dragover.prevent.stop="onDragOver(index)"
				@drop.prevent.stop="onDrop(index)">
				<button
					v-if="!isPinned(block)"
					type="button"
					class="cn-block-list-editor__handle"
					draggable="true"
					:aria-label="t('nextcloud-vue', 'Reorder {item}: drag, or press the up and down arrow keys', { item: typeLabel(block.type) })"
					:data-testid="`cn-block-handle-${block.id}`"
					@dragstart="onDragStart($event, index)"
					@dragend="onDragEnd"
					@keydown.up.prevent="move(index, -1, 'handle')"
					@keydown.down.prevent="move(index, 1, 'handle')">
					<DragVertical :size="20" />
				</button>
				<span v-else class="cn-block-list-editor__handle cn-block-list-editor__handle--pinned" aria-hidden="true" />
				<button
					type="button"
					class="cn-block-list-editor__select"
					:aria-pressed="selectedId === block.id ? 'true' : 'false'"
					:data-testid="`cn-block-select-${block.id}`"
					@click="select(block.id)">
					<strong>{{ typeLabel(block.type) }}</strong>
					<span class="cn-block-list-editor__summary">{{ summary(block) }}</span>
				</button>
				<span v-if="!isPinned(block)" class="cn-block-list-editor__actions">
					<button
						:ref="`up-${block.id}`"
						type="button"
						class="cn-block-list-editor__button"
						:disabled="index === 0"
						:aria-label="t('nextcloud-vue', 'Move {item} up', { item: typeLabel(block.type) })"
						:data-testid="`cn-block-up-${block.id}`"
						@click="move(index, -1)">
						<ChevronUp :size="20" />
					</button>
					<button
						:ref="`down-${block.id}`"
						type="button"
						class="cn-block-list-editor__button"
						:disabled="index >= lastMovableIndex"
						:aria-label="t('nextcloud-vue', 'Move {item} down', { item: typeLabel(block.type) })"
						:data-testid="`cn-block-down-${block.id}`"
						@click="move(index, 1)">
						<ChevronDown :size="20" />
					</button>
					<button
						type="button"
						class="cn-block-list-editor__button"
						:aria-label="t('nextcloud-vue', 'Remove {item}', { item: typeLabel(block.type) })"
						:data-testid="`cn-block-remove-${block.id}`"
						@click="remove(index)">
						<Delete :size="20" />
					</button>
				</span>
			</li>
		</ol>
		<p v-if="blocks.length === 0" class="cn-block-list-editor__empty" data-testid="cn-block-list-empty">
			{{ emptyText || t('nextcloud-vue', 'No blocks yet. Add one above.') }}
		</p>

		<section
			v-if="selected"
			class="cn-block-list-editor__properties"
			:aria-label="t('nextcloud-vue', '{item} properties', { item: typeLabel(selected.type) })"
			data-testid="cn-block-properties">
			<h4 class="cn-block-list-editor__properties-title">
				{{ typeLabel(selected.type) }}
			</h4>
			<template v-for="field in selectedFields" :key="field.key">
				<NcTextField
					v-if="field.type === 'text' || field.type === 'url' || !field.type"
					:modelValue="String(fieldValue(field) ?? '')"
					:label="field.label"
					:error="isMissing(field)"
					:helperText="isMissing(field) ? (field.requiredHint || '') : (field.helperText || '')"
					:data-testid="`cn-block-field-${field.key}`"
					@update:modelValue="setProp(field.key, $event)" />
				<NcTextField
					v-else-if="field.type === 'number'"
					type="number"
					:modelValue="String(fieldValue(field) ?? '')"
					:label="field.label"
					:min="field.min"
					:max="field.max"
					:helperText="field.helperText || ''"
					:data-testid="`cn-block-field-${field.key}`"
					@update:modelValue="setProp(field.key, $event === '' ? null : Number($event))" />
				<NcTextArea
					v-else-if="field.type === 'textarea'"
					:modelValue="ownText(field)"
					:label="field.label"
					:rows="field.rows || 3"
					:helperText="field.helperText || ''"
					:data-testid="`cn-block-field-${field.key}`"
					@update:modelValue="setText(field, $event)" />
				<div v-else-if="field.type === 'markdown'" class="cn-block-list-editor__field">
					<CnMarkdownEditor
						:modelValue="String(fieldValue(field) ?? '')"
						:aria-label="field.label"
						:rows="field.rows || 8"
						:data-testid="`cn-block-field-${field.key}`"
						@update:modelValue="setProp(field.key, $event)" />
					<p v-if="field.helperText" class="cn-block-list-editor__hint">
						{{ field.helperText }}
					</p>
				</div>
				<NcSelect
					v-else-if="field.type === 'select'"
					:modelValue="selectedOption(field)"
					:options="field.options || []"
					label="label"
					:inputLabel="field.label"
					:clearable="false"
					:data-testid="`cn-block-field-${field.key}`"
					@update:modelValue="setProp(field.key, $event ? $event.value : null)" />
				<label v-else-if="field.type === 'color'" class="cn-block-list-editor__field cn-block-list-editor__field--inline">
					<span>{{ field.label }}</span>
					<input
						type="color"
						:value="fieldValue(field) || field.default || '#000000'"
						:data-testid="`cn-block-field-${field.key}`"
						@input="setProp(field.key, $event.target.value)">
				</label>
				<template v-if="Array.isArray(field.fixedTokens) && field.fixedTokens.length > 0">
					<p class="cn-block-list-editor__hint">
						{{ field.fixedTokensHint || t('nextcloud-vue', 'This text always ends with:') }}
					</p>
					<ul class="cn-block-list-editor__chips" data-testid="cn-block-fixed-tokens">
						<li v-for="token in field.fixedTokens" :key="token.token">
							{{ token.label }}
						</li>
					</ul>
				</template>
			</template>
			<p v-if="selectedType && selectedType.hint" class="cn-block-list-editor__hint">
				{{ selectedType.hint }}
			</p>
		</section>

		<p class="hidden-visually" aria-live="polite" data-testid="cn-block-list-live">
			{{ announcement }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import CnMarkdownEditor from '../CnMarkdownEditor/CnMarkdownEditor.vue'

let blockUid = 0

/**
 * CnBlockListEditor - an ordered list of typed blocks a user builds: a
 * palette adds a block of a type, the list reorders by drag, by the arrow
 * keys on a block's handle and by move up and down buttons, and the picked
 * block's properties are edited in a panel of fields the type declares.
 * Every move is announced in a polite live region (WCAG 2.5.7: dragging is
 * never the only way).
 *
 * A block is `{ id, type, props }`. Each entry of `types` names a type, its
 * label and its `fields` (`{ key, label, type, ... }`, where `type` is
 * `text`, `url`, `number`, `textarea`, `markdown`, `select` or `color`).
 * A `pinnedLast` type always sits at the end and cannot be moved or removed
 * (a mail footer). A textarea field with `fixedTokens` always ends with those
 * tokens: the user edits the text before them and sees them as chips.
 *
 * ```vue
 * <CnBlockListEditor
 *   v-model="blocks"
 *   :types="[
 *     { type: 'heading', label: 'Heading', fields: [{ key: 'text', label: 'Heading text' }] },
 *     { type: 'footer', label: 'Footer', addable: false, fields: [{ key: 'text', label: 'Footer text', type: 'textarea', fixedTokens: [{ token: '{{unsubscribe}}', label: 'The unsubscribe link' }] }] },
 *   ]"
 *   pinned-last="footer" />
 * ```
 *
 * @spec openspec/changes/block-list-editor/specs/block-list-editor/spec.md#requirement-a-user-builds-an-ordered-list-of-typed-blocks
 */
export default {
	name: 'CnBlockListEditor',

	components: {
		ChevronDown,
		ChevronUp,
		CnMarkdownEditor,
		Delete,
		DragVertical,
		NcButton,
		NcSelect,
		NcTextArea,
		NcTextField,
	},

	props: {
		/**
		 * The blocks, in order: `[{ id, type, props }]`.
		 *
		 * @type {Array<{id: string, type: string, props: object}>}
		 */
		modelValue: {
			type: Array,
			default: () => [],
		},

		/**
		 * The block types: `[{ type, label, fields?, addable?, summary?, hint? }]`.
		 * `addable: false` leaves a type out of the palette; `summary` names the
		 * props (in order) whose first value the list shows beside the label;
		 * `hint` is shown under the type's fields.
		 *
		 * @type {Array<{type: string, label: string, fields?: Array<object>, addable?: boolean, summary?: Array<string>, hint?: string}>}
		 */
		types: {
			type: Array,
			required: true,
		},

		/**
		 * A type that always sits last and cannot be moved or removed.
		 *
		 * @type {string}
		 */
		pinnedLast: {
			type: String,
			default: '',
		},

		/**
		 * The most blocks the list takes; 0 for no limit. The palette is
		 * disabled at the limit.
		 *
		 * @type {number}
		 */
		maxBlocks: {
			type: Number,
			default: 0,
		},

		/**
		 * Makes a new block of a type. Without it a block gets a generated id
		 * and the fields' `default` values.
		 *
		 * @type {((type: string) => {id: string, type: string, props: object})|null}
		 */
		createBlock: {
			type: Function,
			default: null,
		},

		/**
		 * The palette's label (default "Add a block").
		 *
		 * @type {string}
		 */
		addLabel: {
			type: String,
			default: '',
		},

		/**
		 * The list's accessible name (default "Blocks").
		 *
		 * @type {string}
		 */
		listLabel: {
			type: String,
			default: '',
		},

		/**
		 * Shown when the list is empty.
		 *
		 * @type {string}
		 */
		emptyText: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			selectedId: '',
			announcement: '',
			dragIndex: null,
			dragType: '',
			dropIndex: null,
		}
	},

	computed: {
		/**
		 * The blocks with the pinned type moved to the end.
		 *
		 * @return {Array<object>}
		 */
		blocks() {
			return this.pinLast(Array.isArray(this.modelValue) ? this.modelValue : [])
		},

		addableTypes() {
			return this.types.filter((type) => type && type.addable !== false && type.type !== this.pinnedLast)
		},

		atMax() {
			return this.maxBlocks > 0 && this.blocks.length >= this.maxBlocks
		},

		/**
		 * The index of the last block that may move: before a pinned block.
		 *
		 * @return {number}
		 */
		lastMovableIndex() {
			const last = this.blocks.length - 1
			return last >= 0 && this.isPinned(this.blocks[last]) ? last - 1 : last
		},

		selected() {
			return this.blocks.find((block) => block.id === this.selectedId) || null
		},

		selectedType() {
			return this.selected ? this.typeOf(this.selected.type) : null
		},

		selectedFields() {
			return (this.selectedType && Array.isArray(this.selectedType.fields)) ? this.selectedType.fields : []
		},
	},

	methods: {
		t,

		typeOf(type) {
			return this.types.find((entry) => entry && entry.type === type) || null
		},

		typeLabel(type) {
			const entry = this.typeOf(type)
			return (entry && entry.label) || type
		},

		isPinned(block) {
			return Boolean(this.pinnedLast) && block && block.type === this.pinnedLast
		},

		/**
		 * The list with the pinned blocks at the end, in their own order.
		 *
		 * @param {Array<object>} list The blocks.
		 * @return {Array<object>}
		 */
		pinLast(list) {
			if (!this.pinnedLast) {
				return list
			}
			return [...list.filter((block) => !this.isPinned(block)), ...list.filter((block) => this.isPinned(block))]
		},

		/**
		 * The first non-empty value among the type's summary props (else any
		 * text prop), cut at a template tag and at 60 characters.
		 *
		 * @param {object} block The block.
		 * @return {string}
		 */
		summary(block) {
			const props = block.props || {}
			const entry = this.typeOf(block.type)
			const keys = (entry && Array.isArray(entry.summary)) ? entry.summary : ((entry && entry.fields) || []).map((field) => field.key)
			const value = keys.map((key) => props[key]).find((v) => typeof v === 'string' && v.trim() !== '') || ''
			return String(value).split('{{')[0].slice(0, 60)
		},

		newBlock(type) {
			if (typeof this.createBlock === 'function') {
				return this.createBlock(type)
			}
			blockUid += 1
			const props = {}
			for (const field of (this.typeOf(type)?.fields || [])) {
				if (field.default !== undefined) {
					props[field.key] = field.default
				}
			}
			return { id: `block-${Date.now().toString(36)}-${blockUid}`, type, props }
		},

		emitBlocks(next) {
			this.$emit('update:modelValue', this.pinLast(next))
		},

		select(id) {
			this.selectedId = this.selectedId === id ? '' : id
		},

		/**
		 * Add a block of a type at a position (default before the pinned block).
		 *
		 * @param {string} type The type.
		 * @param {number} [at] The position.
		 */
		add(type, at) {
			if (this.atMax) {
				return
			}
			const block = this.newBlock(type)
			const next = [...this.blocks]
			const position = Number.isInteger(at) ? Math.min(at, this.lastMovableIndex + 1) : this.lastMovableIndex + 1
			next.splice(position, 0, block)
			this.selectedId = block.id
			this.announcement = t('nextcloud-vue', '{item} added', { item: this.typeLabel(type) })
			this.emitBlocks(next)
		},

		remove(index) {
			const block = this.blocks[index]
			if (!block || this.isPinned(block)) {
				return
			}
			if (block.id === this.selectedId) {
				this.selectedId = ''
			}
			const next = [...this.blocks]
			next.splice(index, 1)
			this.announcement = t('nextcloud-vue', '{item} removed', { item: this.typeLabel(block.type) })
			this.emitBlocks(next)
		},

		/**
		 * Move a block one place, keep focus on the control that moved it (or
		 * the other one at an end), and announce where it went.
		 *
		 * @param {number} index The block's position.
		 * @param {number} delta -1 up, 1 down.
		 * @param {string} [via] 'handle' when moved with the arrow keys.
		 */
		move(index, delta, via) {
			const to = index + delta
			const block = this.blocks[index]
			if (!block || this.isPinned(block) || to < 0 || to > this.lastMovableIndex) {
				return
			}
			this.moveTo(index, to)
			this.$nextTick(() => {
				let ref = via === 'handle' ? `handle-${block.id}` : (delta < 0 ? `up-${block.id}` : `down-${block.id}`)
				if (via !== 'handle' && (to === 0 || to === this.lastMovableIndex)) {
					ref = delta < 0 ? `down-${block.id}` : `up-${block.id}`
				}
				const el = via === 'handle'
					? this.$el.querySelector(`[data-testid="cn-block-handle-${block.id}"]`)
					: (Array.isArray(this.$refs[ref]) ? this.$refs[ref][0] : this.$refs[ref])
				if (el && typeof el.focus === 'function') {
					el.focus()
				}
			})
		},

		moveTo(from, to) {
			const next = [...this.blocks]
			const [block] = next.splice(from, 1)
			next.splice(to, 0, block)
			this.announcement = t('nextcloud-vue', '{item} moved to position {position} of {total}', { item: this.typeLabel(block.type), position: to + 1, total: next.length })
			this.emitBlocks(next)
		},

		onDragStart(event, index) {
			this.dragIndex = index
			this.dragType = ''
			if (event && event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', String(index))
			}
		},

		onPaletteDragStart(event, type) {
			this.dragIndex = null
			this.dragType = type
			if (event && event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'copy'
				event.dataTransfer.setData('text/plain', type)
			}
		},

		onDragOver(index) {
			this.dropIndex = index
		},

		/**
		 * A drop on a position: a palette type is added there, a block is
		 * moved there. Nothing lands after the pinned block.
		 *
		 * @param {number} index The position dropped on.
		 */
		onDrop(index) {
			const target = Math.min(index, this.lastMovableIndex + (this.dragType ? 1 : 0))
			if (this.dragType) {
				this.add(this.dragType, target)
			} else if (Number.isInteger(this.dragIndex) && this.dragIndex !== target) {
				this.moveTo(this.dragIndex, Math.max(0, Math.min(target, this.lastMovableIndex)))
			}
			this.onDragEnd()
		},

		onDragEnd() {
			this.dragIndex = null
			this.dragType = ''
			this.dropIndex = null
		},

		fieldValue(field) {
			const props = (this.selected && this.selected.props) || {}
			return props[field.key] !== undefined ? props[field.key] : field.default
		},

		isMissing(field) {
			const value = this.fieldValue(field)
			return field.required === true && (value === undefined || value === null || String(value).trim() === '')
		},

		selectedOption(field) {
			const value = this.fieldValue(field)
			return (field.options || []).find((option) => option.value === value) || null
		},

		/**
		 * The text of a field without its fixed tokens.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 */
		ownText(field) {
			const text = String(this.fieldValue(field) ?? '')
			return (field.fixedTokens || []).reduce((acc, token) => acc.split(token.token).join(''), text).trim()
		},

		/**
		 * Store a field's text with its fixed tokens appended, one per line.
		 *
		 * @param {object} field The field.
		 * @param {string} text The text the user typed.
		 */
		setText(field, text) {
			const tokens = (field.fixedTokens || []).map((token) => token.token)
			if (tokens.length === 0) {
				this.setProp(field.key, text)
				return
			}
			const own = tokens.reduce((acc, token) => acc.split(token).join(''), text || '').trim()
			this.setProp(field.key, [own, ...tokens].filter(Boolean).join('\n'))
		},

		setProp(key, value) {
			this.emitBlocks(this.blocks.map((block) => (block.id === this.selectedId
				? { ...block, props: { ...(block.props || {}), [key]: value } }
				: block)))
		},
	},
}
</script>

<style scoped>
.cn-block-list-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-block-list-editor__palette {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-block-list-editor__palette-label {
	font-weight: 600;
	margin-inline-end: 4px;
}

.cn-block-list-editor__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-block-list-editor__block {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
}

.cn-block-list-editor__block--selected {
	border-color: var(--color-primary-element);
}

.cn-block-list-editor__block--over {
	box-shadow: inset 0 2px 0 var(--color-primary-element);
}

.cn-block-list-editor__handle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 34px;
	min-height: 34px;
	border: none;
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: grab;
}

.cn-block-list-editor__handle--pinned {
	cursor: default;
}

.cn-block-list-editor__select {
	flex: 1;
	display: flex;
	gap: 8px;
	align-items: baseline;
	min-height: 34px;
	text-align: start;
	border: none;
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-block-list-editor__summary {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-block-list-editor__actions {
	display: flex;
	gap: 2px;
}

.cn-block-list-editor__button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 34px;
	min-height: 34px;
	border: none;
	border-radius: var(--border-radius-element, 8px);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-block-list-editor__button:disabled {
	opacity: 0.5;
	cursor: default;
}

.cn-block-list-editor__properties {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
}

.cn-block-list-editor__properties-title {
	margin: 0;
}

.cn-block-list-editor__field--inline {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-block-list-editor__hint,
.cn-block-list-editor__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-block-list-editor__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-block-list-editor__chips li {
	padding: 2px 10px;
	border-radius: var(--border-radius-pill, 16px);
	background: var(--color-background-dark);
}
</style>
