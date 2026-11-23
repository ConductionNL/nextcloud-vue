<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-sm-node" :class="{ 'cn-sm-node--final': final }">
		<div class="cn-sm-node__header">
			<span class="cn-sm-node__name">{{ label }}</span>
			<span
				v-if="showSteps && steps.length > 0"
				class="cn-sm-node__count"
				:title="say('stepCount', { count: steps.length })">
				<span aria-hidden="true">{{ steps.length }}</span>
				<span class="cn-sm-node__sr">{{ say('stepCount', { count: steps.length }) }}</span>
			</span>

			<!-- Every pointer gesture on the canvas has a menu entry here, so a
			     keyboard reaches all of them. Keys and pointer events stop at
			     this wrapper: the node's own handler would otherwise move or
			     remove the state on an arrow or Delete meant for the menu. -->
			<div
				v-if="!readOnly"
				class="cn-sm-node__menu nodrag nopan"
				@keydown.stop
				@click.stop
				@mousedown.stop
				@pointerdown.stop>
				<NcActions
					:open="menuOpen"
					:inline="0"
					:aria-label="say('stateActions', { name: label })"
					@update:open="$emit('update:menuOpen', $event)">
					<NcActionButton
						v-for="target in connectTargets"
						:key="`connect-${target.id}`"
						closeAfterClick
						@click="$emit('connect', target.id)">
						<template #icon>
							<ArrowRight :size="20" />
						</template>
						{{ say('connectTo', { name: target.label }) }}
					</NcActionButton>
					<NcActionButton
						v-for="transition in outgoing"
						:key="`edit-${transition.id}`"
						closeAfterClick
						@click="$emit('edit-transition', transition.id)">
						<template #icon>
							<Pencil :size="20" />
						</template>
						{{ say('editTransitionTo', { name: transition.targetLabel }) }}
					</NcActionButton>
					<NcActionButton
						v-for="transition in outgoing"
						:key="`disconnect-${transition.id}`"
						closeAfterClick
						@click="$emit('disconnect', transition.id)">
						<template #icon>
							<LinkOff :size="20" />
						</template>
						{{ say('disconnectFrom', { name: transition.targetLabel }) }}
					</NcActionButton>
					<NcActionButton v-if="showSteps" closeAfterClick @click="$emit('add-step')">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ say('addStep') }}
					</NcActionButton>
					<NcActionButton closeAfterClick @click="$emit('delete-state')">
						<template #icon>
							<DeleteOutline :size="20" />
						</template>
						{{ say('deleteState') }}
					</NcActionButton>
				</NcActions>
			</div>
		</div>

		<span v-if="final" class="cn-sm-node__chip">{{ say('final') }}</span>

		<ul v-if="showSteps && steps.length > 0" class="cn-sm-node__steps">
			<li v-for="(step, index) in steps" :key="step.id">
				<button
					type="button"
					class="cn-sm-node__step nodrag nopan"
					:class="{
						'cn-sm-node__step--required': isRequired(step),
						'cn-sm-node__step--selected': step.id === selectedStepId,
					}"
					:aria-pressed="step.id === selectedStepId ? 'true' : 'false'"
					:draggable="readOnly ? 'false' : 'true'"
					@click.stop="$emit('step-click', step.id)"
					@keydown="onStepKeydown(index, $event)"
					@mousedown.stop
					@pointerdown.stop
					@dragstart.stop="onStepDragStart(index, $event)"
					@dragover.prevent
					@drop.stop.prevent="onStepDrop(index)">
					<span v-if="isRequired(step)" class="cn-sm-node__required" aria-hidden="true">*</span>
					<span class="cn-sm-node__step-name">{{ stepTitle(step) }}</span>
					<span v-if="isRequired(step)" class="cn-sm-node__sr">{{ say('required') }}</span>
					<span v-if="badgeOf(step) > 0" class="cn-sm-node__checks">{{ badgeOf(step) }}</span>
				</button>
			</li>
		</ul>

		<button
			v-if="showSteps && !readOnly"
			type="button"
			class="cn-sm-node__add nodrag nopan"
			@click.stop="$emit('add-step')"
			@keydown.stop
			@mousedown.stop
			@pointerdown.stop>
			<Plus :size="16" />
			<span>{{ say('addStep') }}</span>
		</button>
	</div>
</template>

<script>
import { NcActionButton, NcActions } from '@nextcloud/vue'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import DeleteOutline from 'vue-material-design-icons/DeleteOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { asList } from '../../utils/stateMachineValidation.js'

/**
 * The body of one state on the CnStateMachineEditor canvas: its name, its
 * steps, and a menu that offers every canvas gesture from the keyboard.
 *
 * Rendered inside CnGraphCanvas's focusable node wrapper, which owns moving
 * (arrow keys), connecting (`c`) and removing (Delete) the state.
 */
export default {
	name: 'CnStateMachineNode',

	components: { NcActions, NcActionButton, ArrowRight, DeleteOutline, LinkOff, Pencil, Plus },

	props: {
		/** The state's name. */
		label: {
			type: String,
			required: true,
		},

		/** Whether the state is final. */
		final: {
			type: Boolean,
			default: false,
		},

		/** The state's steps, in order. */
		steps: {
			type: Array,
			default: () => [],
		},

		/** Whether steps are part of this machine. */
		showSteps: {
			type: Boolean,
			default: true,
		},

		/** Record keys of a step: `{ title, required, badge }`. */
		stepKeys: {
			type: Object,
			default: () => ({ title: 'title', required: 'required', badge: '' }),
		},

		/** The step whose panel is open. */
		selectedStepId: {
			type: String,
			default: null,
		},

		/** States this one has no transition to yet: `{ id, label }`. */
		connectTargets: {
			type: Array,
			default: () => [],
		},

		/** Transitions leaving this state: `{ id, targetLabel }`. */
		outgoing: {
			type: Array,
			default: () => [],
		},

		/** Whether the actions menu is open. */
		menuOpen: {
			type: Boolean,
			default: false,
		},

		/** Hide every editing control. */
		readOnly: {
			type: Boolean,
			default: false,
		},

		/** Resolves an editor text by name: `(name, vars) => string`. */
		say: {
			type: Function,
			required: true,
		},
	},

	emits: [
		'add-step',
		'connect',
		'delete-state',
		'disconnect',
		'edit-transition',
		'step-click',
		'step-move',
		'update:menuOpen',
	],

	data() {
		return {
			dragIndex: null,
		}
	},

	methods: {
		/**
		 * @param {object} step A step.
		 * @return {string} Its title.
		 */
		stepTitle(step) {
			return step[this.stepKeys.title] || ''
		},

		/**
		 * @param {object} step A step.
		 * @return {boolean} Whether it is required.
		 */
		isRequired(step) {
			return this.stepKeys.required ? step[this.stepKeys.required] === true : false
		},

		/**
		 * @param {object} step A step.
		 * @return {number} The length of the list its badge counts, 0 for none.
		 */
		badgeOf(step) {
			return this.stepKeys.badge ? asList(step[this.stepKeys.badge]).length : 0
		},

		/**
		 * Keys on a step stay on the step: Alt with an arrow moves it within the
		 * state, everything else is the button's own.
		 *
		 * @param {number} index The step's position.
		 * @param {KeyboardEvent} event The key event.
		 * @return {void}
		 */
		onStepKeydown(index, event) {
			event.stopPropagation()
			if (this.readOnly || event.altKey !== true) {
				return
			}
			if (event.key === 'ArrowUp' && index > 0) {
				event.preventDefault()
				this.$emit('step-move', { from: index, to: index - 1 })
			} else if (event.key === 'ArrowDown' && index < this.steps.length - 1) {
				event.preventDefault()
				this.$emit('step-move', { from: index, to: index + 1 })
			}
		},

		/**
		 * @param {number} index The dragged step.
		 * @param {DragEvent} event The drag event.
		 * @return {void}
		 */
		onStepDragStart(index, event) {
			this.dragIndex = index
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', String(index))
			}
		},

		/**
		 * @param {number} index The step dropped on.
		 * @return {void}
		 */
		onStepDrop(index) {
			if (this.dragIndex !== null && this.dragIndex !== index) {
				this.$emit('step-move', { from: this.dragIndex, to: index })
			}
			this.dragIndex = null
		},
	},
}
</script>

<style scoped>
.cn-sm-node {
	display: flex;
	flex-direction: column;
	gap: 6px;
	text-align: start;
}

.cn-sm-node__header {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.cn-sm-node__name {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	font-size: 14px;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-sm-node__count {
	flex: none;
	min-width: 20px;
	padding: 0 6px;
	border-radius: 10px;
	background: var(--color-primary-element, #0082c9);
	color: var(--color-primary-element-text, #fff);
	font-size: 12px;
	font-weight: 600;
	text-align: center;
}

.cn-sm-node__menu {
	flex: none;
	margin: -6px -8px -6px 0;
}

.cn-sm-node__chip {
	align-self: flex-start;
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--color-success, #2d7b41);
	color: var(--color-success-text, #fff);
	font-size: 12px;
	font-weight: 600;
}

.cn-sm-node__steps {
	display: flex;
	flex-direction: column;
	margin: 0 -12px;
	padding: 0;
	list-style: none;
}

.cn-sm-node__step {
	display: flex;
	align-items: center;
	gap: 4px;
	width: 100%;
	min-height: 28px;
	padding: 2px 12px;
	border: 0;
	background: none;
	color: var(--color-main-text, #222);
	font: inherit;
	font-size: 13px;
	text-align: start;
	cursor: pointer;
}

.cn-sm-node__step:hover,
.cn-sm-node__step--selected {
	background: var(--color-background-hover, #f5f5f5);
}

.cn-sm-node__step:focus-visible,
.cn-sm-node__add:focus-visible {
	outline: 2px solid var(--color-primary-element, #0082c9);
	outline-offset: -2px;
}

.cn-sm-node__step--required {
	font-weight: 600;
}

.cn-sm-node__required {
	color: var(--color-error-text, #c9302c);
}

.cn-sm-node__step-name {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-sm-node__checks {
	flex: none;
	padding: 0 4px;
	border-radius: 4px;
	background: var(--color-background-dark, #ededed);
	color: var(--color-text-maxcontrast, #6b6b6b);
	font-size: 11px;
}

.cn-sm-node__add {
	display: flex;
	align-items: center;
	gap: 4px;
	margin: 0 -12px -8px;
	min-height: 32px;
	padding: 4px 12px;
	border: 0;
	border-top: 1px solid var(--color-border, #d0d0d0);
	background: none;
	color: var(--color-text-maxcontrast, #6b6b6b);
	font: inherit;
	font-size: 13px;
	cursor: pointer;
}

.cn-sm-node__add:hover {
	background: var(--color-background-hover, #f5f5f5);
	color: var(--color-main-text, #222);
}

.cn-sm-node__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
