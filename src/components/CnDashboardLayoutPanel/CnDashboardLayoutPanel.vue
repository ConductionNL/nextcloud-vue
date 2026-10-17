<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section
		class="cn-dashboard-layout-panel"
		:aria-labelledby="headingId"
		data-testid="cn-dashboard-layout-panel"
		@keydown.esc.stop="close">
		<div class="cn-dashboard-layout-panel__head">
			<h2 :id="headingId"
				ref="heading"
				tabindex="-1"
				class="cn-dashboard-layout-panel__title">
				{{ t('nextcloud-vue', 'Arrange this page') }}
			</h2>
			<NcButton
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Close')"
				data-testid="cn-dashboard-layout-panel-close"
				@click="close">
				<template #icon>
					<Close :size="20" />
				</template>
			</NcButton>
		</div>
		<p :id="hintId" class="cn-dashboard-layout-panel__hint">
			{{ t('nextcloud-vue', 'Choose which parts you see and drag them into your own order. Only you see this layout.') }}
		</p>
		<ol class="cn-dashboard-layout-panel__list">
			<li
				v-for="(entry, index) in draft"
				:key="entry.id"
				class="cn-dashboard-layout-panel__item"
				:class="{ 'cn-dashboard-layout-panel__item--over': overIndex === index }"
				:data-testid="`cn-dashboard-layout-panel-item-${entry.id}`"
				@dragover.prevent="overIndex = index"
				@dragleave="overIndex = overIndex === index ? -1 : overIndex"
				@drop.prevent="onDrop(index)">
				<button
					type="button"
					class="cn-dashboard-layout-panel__handle"
					draggable="true"
					:aria-label="t('nextcloud-vue', 'Move {name}', { name: entry.label })"
					:aria-describedby="moveHintId"
					:data-testid="`cn-dashboard-layout-panel-handle-${entry.id}`"
					@dragstart="onDragStart(index, $event)"
					@dragend="overIndex = -1"
					@keydown.up.prevent="move(index, index - 1)"
					@keydown.down.prevent="move(index, index + 1)">
					<DragVertical :size="20" />
				</button>
				<label class="cn-dashboard-layout-panel__label">
					<input
						type="checkbox"
						class="cn-dashboard-layout-panel__check"
						:checked="!entry.hidden"
						:data-testid="`cn-dashboard-layout-panel-check-${entry.id}`"
						@change="entry.hidden = !$event.target.checked">
					<span class="cn-dashboard-layout-panel__name">{{ entry.label }}</span>
				</label>
				<span class="cn-dashboard-layout-panel__state" :class="{ 'cn-dashboard-layout-panel__state--hidden': entry.hidden }">
					{{ entry.hidden ? t('nextcloud-vue', 'Hidden') : t('nextcloud-vue', 'Shown') }}
				</span>
			</li>
		</ol>
		<p :id="moveHintId" class="hidden-visually">
			{{ t('nextcloud-vue', 'Use the arrow keys to move this part up or down.') }}
		</p>
		<p class="hidden-visually" aria-live="polite" data-testid="cn-dashboard-layout-panel-live">
			{{ announcement }}
		</p>
		<div class="cn-dashboard-layout-panel__actions">
			<NcButton variant="tertiary" data-testid="cn-dashboard-layout-panel-reset" @click="reset">
				{{ t('nextcloud-vue', 'Back to default') }}
			</NcButton>
			<NcButton variant="primary" data-testid="cn-dashboard-layout-panel-save" @click="save">
				{{ t('nextcloud-vue', 'Save layout') }}
			</NcButton>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'

let panelCounter = 0

/**
 * CnDashboardLayoutPanel - "Arrange this page" (board PqMijnWerkIndelen): the
 * page's sections with a checkbox to show or hide each one and a handle to
 * drag it into another place (or move it with the arrow keys), "Back to
 * default" and "Save layout". It edits a copy of `items` and hands the result
 * back on save; CnDashboardPage stores it per user.
 *
 * @spec openspec/changes/dashboard-layout-panel/specs/dashboard-page/spec.md#requirement-a-user-arranges-the-page-in-a-side-panel
 *
 * @event close Emitted by the close button and Escape.
 * @event reset Emitted by "Back to default".
 * @event save Emitted by "Save layout" with the entries in their new order, each `{ id, label, hidden }`.
 */
export default {
	name: 'CnDashboardLayoutPanel',

	components: { NcButton, Close, DragVertical },

	props: {
		/** The page's sections in their current order: `{ id, label, hidden }`. */
		items: { type: Array, default: () => [] },
	},

	emits: ['close', 'reset', 'save'],

	data() {
		const uid = ++panelCounter
		return {
			draft: [],
			dragIndex: -1,
			overIndex: -1,
			announcement: '',
			headingId: `cn-dashboard-layout-panel-${uid}`,
			hintId: `cn-dashboard-layout-panel-${uid}-hint`,
			moveHintId: `cn-dashboard-layout-panel-${uid}-move`,
		}
	},

	watch: {
		items: {
			immediate: true,
			handler(items) {
				this.draft = (Array.isArray(items) ? items : []).map((entry) => ({ id: String(entry.id), label: entry.label || String(entry.id), hidden: entry.hidden === true }))
			},
		},
	},

	mounted() {
		if (this.$refs.heading && typeof this.$refs.heading.focus === 'function') {
			this.$refs.heading.focus()
		}
	},

	methods: {
		t,

		/**
		 * Move a section to another place in the draft.
		 *
		 * @param {number} from Its index.
		 * @param {number} to The index it moves to.
		 */
		move(from, to) {
			if (to < 0 || to >= this.draft.length || from === to) {
				return
			}
			const next = [...this.draft]
			const [entry] = next.splice(from, 1)
			next.splice(to, 0, entry)
			this.draft = next
			this.announcement = t('nextcloud-vue', '{name} moved to position {position} of {total}', { name: entry.label, position: to + 1, total: next.length })
			this.$nextTick(() => {
				const handle = this.$el.querySelector(`[data-testid="cn-dashboard-layout-panel-handle-${entry.id}"]`)
				if (handle) {
					handle.focus()
				}
			})
		},

		/**
		 * Start dragging a section.
		 *
		 * @param {number} index Its index.
		 * @param {DragEvent} event The drag event.
		 */
		onDragStart(index, event) {
			this.dragIndex = index
			if (event && event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', this.draft[index].id)
			}
		},

		/**
		 * Drop the dragged section on another one's place.
		 *
		 * @param {number} index The index it is dropped on.
		 */
		onDrop(index) {
			if (this.dragIndex >= 0) {
				this.move(this.dragIndex, index)
			}
			this.dragIndex = -1
			this.overIndex = -1
		},

		/** Hand the arranged sections back. */
		save() {
			/**
			 * @event save Emitted by "Save layout" with the entries in their new order, each `{ id, label, hidden }`.
			 */
			this.$emit('save', this.draft.map((entry) => ({ ...entry })))
		},

		/** Ask to close the panel. */
		close() {
			/**
			 * @event close Emitted by the close button and Escape.
			 */
			this.$emit('close')
		},

		/** Ask for the default layout. */
		reset() {
			/**
			 * @event reset Emitted by "Back to default".
			 */
			this.$emit('reset')
		},
	},
}
</script>

<style scoped>
.cn-dashboard-layout-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px;
	border: 1px solid var(--color-border);
	border-radius: var(--cn-board-card-radius, 12px);
	background: var(--color-main-background);
	box-shadow: 0 12px 40px color-mix(in srgb, var(--color-main-text) 18%, transparent);
}

.cn-dashboard-layout-panel__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.cn-dashboard-layout-panel__title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-dashboard-layout-panel__hint {
	margin: 0;
	font-size: 14px;
	line-height: 1.5;
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-layout-panel__list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-dashboard-layout-panel__item {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 44px;
	padding: 0 10px 0 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
}

.cn-dashboard-layout-panel__item--over {
	border-color: var(--color-primary-element);
}

.cn-dashboard-layout-panel__handle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	min-height: 32px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: var(--border-radius-element, 8px);
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: grab;
}

.cn-dashboard-layout-panel__handle:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 1px;
}

.cn-dashboard-layout-panel__label {
	display: flex;
	flex: 1 1 auto;
	align-items: center;
	gap: 10px;
	min-width: 0;
	font-size: 15px;
	cursor: pointer;
}

.cn-dashboard-layout-panel__check {
	width: 18px;
	height: 18px;
	margin: 0;
	accent-color: var(--color-primary-element);
}

.cn-dashboard-layout-panel__name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-dashboard-layout-panel__state {
	flex: none;
	font-size: 13px;
	color: var(--color-main-text);
}

.cn-dashboard-layout-panel__state--hidden {
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-layout-panel__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 10px;
	padding-top: 4px;
}
</style>
