<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-block-list-editor" data-testid="cn-block-list-editor">
		<p class="hidden-visually"
			role="status"
			aria-live="polite"
			data-testid="cn-block-list-live">
			{{ announcement }}
		</p>

		<NcNoteCard v-if="draftPositions.length > 0"
			type="warning"
			data-testid="cn-block-list-draft-notice">
			{{ draftNoticeText }}
		</NcNoteCard>

		<p v-if="modelValue.length === 0" class="cn-block-list-editor__empty" data-testid="cn-block-list-empty">
			{{ text.empty }}
		</p>

		<Draggable v-else
			:modelValue="modelValue"
			:itemKey="idKey"
			:disabled="disabled"
			:move="canDragOver"
			tag="ol"
			class="cn-block-list-editor__list"
			handle=".cn-block-list-editor__handle"
			:aria-label="text.list"
			@update:modelValue="onDragged"
			@change="onDragChange">
			<template #item="{ element: block, index }">
				<li class="cn-block-list-editor__block"
					:class="{ 'cn-block-list-editor__block--draft': block.draft }"
					data-testid="cn-block-list-block">
					<div class="cn-block-list-editor__row">
						<span v-if="!block.pinned && !disabled"
							class="cn-block-list-editor__handle"
							:title="text.drag"
							aria-hidden="true">
							<DragVertical :size="20" />
						</span>
						<button v-if="collapsible"
							type="button"
							class="cn-block-list-editor__toggle"
							:aria-expanded="isOpen(block) ? 'true' : 'false'"
							data-testid="cn-block-list-toggle"
							@click="toggle(block)">
							<strong>{{ typeLabel(block) }}</strong>
						</button>
						<strong v-else>{{ typeLabel(block) }}</strong>
						<span class="cn-block-list-editor__summary">
							<!-- @slot summary One line about the block. Props: `block`, `index`, `position`. -->
							<slot name="summary"
								:block="block"
								:index="index"
								:position="index + 1" />
						</span>
						<span class="cn-block-list-editor__actions">
							<template v-if="!block.pinned">
								<NcButton variant="tertiary"
									:disabled="!canMove(index, -1)"
									:aria-label="controlName(text.moveUp, block, index)"
									data-move="up"
									@click="move(index, -1)">
									{{ text.moveUp }}
								</NcButton>
								<NcButton variant="tertiary"
									:disabled="!canMove(index, 1)"
									:aria-label="controlName(text.moveDown, block, index)"
									data-move="down"
									@click="move(index, 1)">
									{{ text.moveDown }}
								</NcButton>
							</template>
							<!-- @slot block-actions Further buttons on the row. Props: `block`, `index`, `position`. -->
							<slot name="block-actions"
								:block="block"
								:index="index"
								:position="index + 1" />
							<NcButton v-if="!block.pinned"
								variant="tertiary"
								:disabled="disabled"
								:aria-label="controlName(text.remove, block, index)"
								data-action="remove"
								@click="remove(index)">
								{{ text.remove }}
							</NcButton>
						</span>
					</div>

					<div v-if="block.draft"
						class="cn-block-list-editor__draft"
						role="group"
						:aria-label="controlName(text.draft, block, index)"
						data-testid="cn-block-list-draft">
						<p class="cn-block-list-editor__draft-text">
							<strong>{{ text.draft }}</strong>
							{{ draftNote(block) }}
						</p>
						<span class="cn-block-list-editor__draft-actions">
							<NcButton variant="primary"
								:aria-label="controlName(text.keep, block, index)"
								data-action="keep"
								@click="keepDraft(index)">
								{{ text.keep }}
							</NcButton>
							<NcButton :aria-label="controlName(text.discard, block, index)"
								data-action="discard"
								@click="discardDraft(index)">
								{{ text.discard }}
							</NcButton>
						</span>
					</div>

					<div v-if="isOpen(block)" class="cn-block-list-editor__body">
						<!-- @slot block-<type> The editor of one block type. Props: `block`, `index`, `position`, `update`. -->
						<slot :name="`block-${block.type}`"
							:block="block"
							:index="index"
							:position="index + 1"
							:update="(changes) => update(index, changes)">
							<!-- @slot block The editor of a type without its own slot. Props: `block`, `index`, `position`, `update`. -->
							<slot name="block"
								:block="block"
								:index="index"
								:position="index + 1"
								:update="(changes) => update(index, changes)" />
						</slot>
					</div>
				</li>
			</template>
		</Draggable>

		<div v-if="!disabled && types.length > 0"
			class="cn-block-list-editor__palette"
			role="group"
			:aria-label="text.add"
			data-testid="cn-block-list-palette">
			<template v-if="palette === 'select'">
				<NcSelect v-model="pickedType"
					class="cn-block-list-editor__picker"
					:options="types"
					:inputLabel="text.type"
					:clearable="false"
					label="label" />
				<NcButton :disabled="!pickedType"
					data-action="add"
					@click="add(pickedType.type)">
					{{ text.add }}
				</NcButton>
			</template>
			<template v-else>
				<span class="cn-block-list-editor__palette-label">{{ text.add }}</span>
				<NcButton v-for="option in types"
					:key="option.type"
					:data-add="option.type"
					@click="add(option.type)">
					{{ option.label }}
				</NcButton>
			</template>
		</div>

		<!-- @slot preview What the blocks look like together. Props: `blocks`. -->
		<slot name="preview" :blocks="modelValue" />
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcNoteCard, NcSelect } from '@nextcloud/vue'
import Draggable from 'vuedraggable'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'

let lastId = 0

/**
 * CnBlockListEditor: an ordered list of typed blocks, each with its own editor
 * (boards LqLesMaken, PqNieuwsbriefWizard, PqProduct).
 *
 * A user adds a block from the palette, and orders the list by dragging or with
 * Move up and Move down. Both say the new position to a screen reader, and the
 * buttons keep focus, so the list works without a pointer (WCAG 2.2 SC 2.1.1,
 * 2.5.7). A block with `draft` waits until the user keeps or discards it, and a
 * block with `pinned` stays where it is.
 *
 * The host owns the list through `v-model` and draws each type's editor in a
 * `block-<type>` slot, so the component knows nothing about what a block holds.
 *
 * ```vue
 * <CnBlockListEditor
 *   v-model="blocks"
 *   :types="[{ type: 'text', label: 'Text', create: () => ({ text: '' }) }]">
 *   <template #block-text="{ block, update }">
 *     <NcTextArea :model-value="block.text" label="Text" @update:model-value="update({ text: $event })" />
 *   </template>
 * </CnBlockListEditor>
 * ```
 *
 * @event update:modelValue The new list of blocks.
 * @event add A block was added: `{ block, index }`.
 * @event remove A block was removed: `{ block, index }`.
 * @event move A block moved: `{ block, from, to }`.
 * @event keep-draft The user kept a draft: `{ block, index }`.
 * @event discard-draft The user discarded a draft: `{ block, index }`.
 * @event pending-drafts The 1-based positions of the blocks still in draft, on mount and on every change. A host holds its save back while the list is not empty.
 * @spec openspec/changes/block-list-editor/specs/block-list-editor/spec.md
 */
export default {
	name: 'CnBlockListEditor',

	components: { Draggable, DragVertical, NcButton, NcNoteCard, NcSelect },

	props: {
		/** The blocks: `{ <idKey>, type, draft?, pinned?, ... }`. `draft` is `true`, a note, or `{ note }`. */
		modelValue: { type: Array, default: () => [] },
		/** The block types a user can add: `{ type, label, create? }`; `create()` returns the fields of a new block. */
		types: { type: Array, default: () => [] },
		/** The field that holds a block's id. */
		idKey: { type: String, default: 'id' },
		/** How the palette offers the types: `buttons`, one per type, or `select`, a field with an add button. */
		palette: {
			type: String,
			default: 'buttons',
			validator: (value) => ['buttons', 'select'].includes(value),
		},

		/** Open a block's editor by pressing its name, rather than showing every editor. */
		collapsible: { type: Boolean, default: false },
		/** Read only: no palette, no moving, no removing. */
		disabled: { type: Boolean, default: false },
		/**
		 * Replacement texts, already translated: `add`, `type`, `list`, `empty`, `drag`, `moveUp`, `moveDown`, `remove`,
		 * `draft`, `keep`, `discard`, `kept`, `discarded`, `removed`, `added` (`{type}`, `{position}`), `moved`
		 * (`{position}`, `{total}`), `draftNotice` (`{position}`), `controlName` (`{action}`, `{type}`, `{position}`).
		 */
		labels: { type: Object, default: () => ({}) },
	},

	emits: ['update:modelValue', 'add', 'remove', 'move', 'keep-draft', 'discard-draft', 'pending-drafts'],

	data() {
		return {
			announcement: '',
			openIds: [],
			pickedType: this.types[0] ?? null,
		}
	},

	computed: {
		/** @return {object} The texts, with library defaults. */
		text() {
			return {
				add: t('nextcloud-vue', 'Add block'),
				type: t('nextcloud-vue', 'Block type'),
				list: t('nextcloud-vue', 'Blocks'),
				empty: t('nextcloud-vue', 'No blocks yet.'),
				drag: t('nextcloud-vue', 'Drag to change the order'),
				moveUp: t('nextcloud-vue', 'Move up'),
				moveDown: t('nextcloud-vue', 'Move down'),
				remove: t('nextcloud-vue', 'Remove'),
				draft: t('nextcloud-vue', 'Draft'),
				keep: t('nextcloud-vue', 'Keep'),
				discard: t('nextcloud-vue', 'Discard'),
				kept: t('nextcloud-vue', 'Draft kept.'),
				discarded: t('nextcloud-vue', 'Draft discarded.'),
				removed: t('nextcloud-vue', 'Block removed.'),
				added: t('nextcloud-vue', '{type} block added at position {position}.'),
				moved: t('nextcloud-vue', 'Block moved to position {position} of {total}.'),
				draftNotice: t('nextcloud-vue', 'Block {position} is still a draft. Keep or discard it first.'),
				controlName: t('nextcloud-vue', '{action}: {type} block {position}'),
				...this.labels,
			}
		},

		/** @return {number[]} 1-based positions of the blocks still in draft. */
		draftPositions() {
			return this.modelValue.flatMap((block, index) => (block.draft ? [index + 1] : []))
		},

		/** @return {string} The notice over the list while a draft is pending. */
		draftNoticeText() {
			return this.fill(this.text.draftNotice, { position: this.draftPositions[0] })
		},
	},

	watch: {
		draftPositions: {
			immediate: true,
			handler(positions, previous) {
				if (!previous || positions.join() !== previous.join()) {
					this.$emit('pending-drafts', positions)
				}
			},
		},
	},

	methods: {
		t,

		/**
		 * @param {string} template A text with `{name}` placeholders.
		 * @param {object} values The values.
		 * @return {string} The text with the values in it.
		 */
		fill(template, values) {
			return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match))
		},

		/**
		 * @param {object} block A block.
		 * @return {string} The label of its type.
		 */
		typeLabel(block) {
			return this.types.find((option) => option.type === block.type)?.label ?? block.type
		},

		/**
		 * The accessible name of a control on a block. It starts with the visible label and
		 * holds the position, because two blocks of one type would otherwise read the same.
		 *
		 * @param {string} action The visible label.
		 * @param {object} block The block.
		 * @param {number} index Its index.
		 * @return {string} The name.
		 */
		controlName(action, block, index) {
			return this.fill(this.text.controlName, { action, type: this.typeLabel(block), position: index + 1 })
		},

		/**
		 * @param {object} block A block in draft.
		 * @return {string} What the host wants to say about the draft.
		 */
		draftNote(block) {
			if (typeof block.draft === 'string') {
				return block.draft
			}
			return block.draft?.note ?? ''
		},

		/**
		 * @param {object} block A block.
		 * @return {boolean} Whether its editor shows.
		 */
		isOpen(block) {
			return !this.collapsible || this.openIds.includes(block[this.idKey])
		},

		/** @param {object} block The block to open or close. */
		toggle(block) {
			const id = block[this.idKey]
			this.openIds = this.openIds.includes(id)
				? this.openIds.filter((other) => other !== id)
				: [...this.openIds, id]
		},

		/**
		 * @param {number} index A block.
		 * @param {number} delta -1 up, 1 down.
		 * @return {boolean} Whether it can move that way: a pinned block neither moves nor gives way.
		 */
		canMove(index, delta) {
			const target = this.modelValue[index + delta]
			return !this.disabled && Boolean(target) && !target.pinned && !this.modelValue[index].pinned
		},

		/**
		 * @param {{relatedContext?: {element?: object}}} event The sortable move event.
		 * @return {boolean} Whether a drag may pass this block.
		 */
		canDragOver(event) {
			return !event?.relatedContext?.element?.pinned
		},

		/**
		 * Move a block with a button, say where it landed and keep focus on the button.
		 *
		 * @param {number} index The block.
		 * @param {number} delta -1 up, 1 down.
		 */
		move(index, delta) {
			if (!this.canMove(index, delta)) {
				return
			}
			const next = [...this.modelValue]
			const to = index + delta
			const block = next[index]
			next[index] = next[to]
			next[to] = block
			this.$emit('update:modelValue', next)
			this.$emit('move', { block, from: index, to })
			this.announceMove(to)
			this.$nextTick(() => {
				const used = delta < 0 ? 'up' : 'down'
				const other = delta < 0 ? 'down' : 'up'
				this.focusIn(to, `[data-move="${used}"]:not(:disabled), [data-move="${other}"]:not(:disabled)`, used)
			})
		},

		/** @param {number} to The index a block landed on. */
		announceMove(to) {
			this.announcement = this.fill(this.text.moved, { position: to + 1, total: this.modelValue.length })
		},

		/** @param {object[]} blocks The list after a drag. */
		onDragged(blocks) {
			this.$emit('update:modelValue', blocks)
		},

		/** @param {{moved?: {element: object, oldIndex: number, newIndex: number}}} change What a drag changed. */
		onDragChange({ moved } = {}) {
			if (moved) {
				this.$emit('move', { block: moved.element, from: moved.oldIndex, to: moved.newIndex })
				this.announceMove(moved.newIndex)
			}
		},

		/**
		 * Focus a control of a block: the first match, preferring `prefer` as data-move value.
		 *
		 * @param {number} index The block.
		 * @param {string} selector What to focus.
		 * @param {string} [prefer] The data-move value to try first.
		 */
		focusIn(index, selector, prefer) {
			const row = this.$el.querySelectorAll('.cn-block-list-editor__block')[index]
			const matches = row ? [...row.querySelectorAll(selector)] : []
			const target = matches.find((element) => element.dataset?.move === prefer) ?? matches[0]
			target?.focus()
		},

		/**
		 * Put focus on the block that took a removed block's place, or else on the palette.
		 *
		 * @param {number} index The place of the removed block.
		 */
		focusAfterRemove(index) {
			this.$nextTick(() => {
				const blocks = this.$el.querySelectorAll('.cn-block-list-editor__block')
				const row = blocks[Math.min(index, blocks.length - 1)]
				const target = row?.querySelector('button:not(:disabled)')
					?? this.$el.querySelector('.cn-block-list-editor__palette button:not(:disabled)')
				target?.focus()
			})
		},

		/** @param {string} type The block type to add, above any pinned blocks at the end. */
		add(type) {
			const option = this.types.find((candidate) => candidate.type === type)
			lastId += 1
			const block = {
				[this.idKey]: `block-${Date.now().toString(36)}-${lastId}`,
				type,
				...(option?.create?.() ?? {}),
			}
			let index = this.modelValue.length
			while (index > 0 && this.modelValue[index - 1].pinned) {
				index -= 1
			}
			const next = [...this.modelValue]
			next.splice(index, 0, block)
			if (this.collapsible) {
				this.openIds = [...this.openIds, block[this.idKey]]
			}
			this.$emit('update:modelValue', next)
			this.$emit('add', { block, index })
			this.announcement = this.fill(this.text.added, { type: this.typeLabel(block), position: index + 1 })
		},

		/**
		 * Drop a block from the list.
		 *
		 * @param {number} index The block.
		 * @return {object} The block that left.
		 */
		drop(index) {
			const next = [...this.modelValue]
			const [block] = next.splice(index, 1)
			this.$emit('update:modelValue', next)
			this.focusAfterRemove(index)
			return block
		},

		/** @param {number} index The block to remove. */
		remove(index) {
			const block = this.drop(index)
			this.$emit('remove', { block, index })
			this.announcement = this.text.removed
		},

		/**
		 * Merge changed fields into a block.
		 *
		 * @param {number} index The block.
		 * @param {object} changes The fields.
		 */
		update(index, changes) {
			this.$emit('update:modelValue', this.modelValue.map((block, position) => (position === index ? { ...block, ...changes } : block)))
		},

		/** @param {number} index The draft block the user keeps; it stops being a draft. */
		keepDraft(index) {
			const { draft, ...block } = this.modelValue[index]
			this.$emit('update:modelValue', this.modelValue.map((other, position) => (position === index ? block : other)))
			this.$emit('keep-draft', { block, index })
			this.announcement = this.text.kept
			this.$nextTick(() => this.focusIn(index, 'button:not(:disabled)'))
		},

		/** @param {number} index The draft block the user throws away. */
		discardDraft(index) {
			const block = this.drop(index)
			this.$emit('discard-draft', { block, index })
			this.announcement = this.text.discarded
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

.cn-block-list-editor__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-block-list-editor__block {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 12px;
}

.cn-block-list-editor__block--draft {
	border-color: var(--color-warning);
}

.cn-block-list-editor__row {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 4px 8px;
}

.cn-block-list-editor__handle {
	color: var(--color-text-maxcontrast);
	cursor: grab;
	display: inline-flex;
}

.cn-block-list-editor__toggle {
	background: none;
	border: 0;
	color: var(--color-main-text);
	cursor: pointer;
	margin: 0;
	padding: 4px;
}

.cn-block-list-editor__summary {
	color: var(--color-text-maxcontrast);
	flex: 1 1 120px;
	min-width: 0;
}

.cn-block-list-editor__actions,
.cn-block-list-editor__draft-actions,
.cn-block-list-editor__palette {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-block-list-editor__draft {
	align-items: center;
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: space-between;
	padding: 8px 12px;
}

.cn-block-list-editor__draft-text,
.cn-block-list-editor__empty {
	margin: 0;
}

.cn-block-list-editor__empty,
.cn-block-list-editor__palette-label {
	color: var(--color-text-maxcontrast);
}

.cn-block-list-editor__picker {
	min-width: 220px;
}
</style>
