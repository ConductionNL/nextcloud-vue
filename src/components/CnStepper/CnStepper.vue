<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<ol class="cn-stepper cn-wizard-dialog__progress"
		:class="[{ 'cn-stepper--board': isBoard }, lookClass]"
		:aria-label="ariaLabel"
		data-testid="cn-stepper">
		<li v-for="(step, idx) in steps"
			:key="step.id"
			class="cn-stepper__item cn-wizard-dialog__progress-item"
			:class="{
				'cn-stepper__item--done': idx < currentIndex,
				'cn-stepper__item--current': idx === currentIndex,
				'cn-stepper__item--upcoming': idx > currentIndex,
				'cn-wizard-dialog__progress-item--active': idx === currentIndex,
				'cn-wizard-dialog__progress-item--done': idx < currentIndex,
				'cn-wizard-dialog__progress-item--clickable': isJumpable(idx),
			}"
			:aria-current="idx === currentIndex ? 'step' : undefined"
			:data-step-id="step.id">
			<component :is="isJumpable(idx) ? 'button' : 'span'"
				class="cn-stepper__step"
				:type="isJumpable(idx) ? 'button' : undefined"
				@click="isJumpable(idx) ? onJump(step.id) : null">
				<span class="cn-stepper__dot cn-wizard-dialog__progress-dot" aria-hidden="true">
					<template v-if="idx < currentIndex">
						<Check v-if="isBoard"
							class="cn-stepper__check cn-wizard-dialog__progress-check"
							:size="16" />
						<span v-else class="cn-wizard-dialog__progress-check">✓</span>
					</template>
					<span v-else>{{ idx + 1 }}</span>
				</span>
				<span class="cn-stepper__label cn-wizard-dialog__progress-label">{{ step.label }}</span>
				<span v-if="idx < currentIndex" class="cn-stepper__sr">{{ ', ' + completedLabel }}</span>
			</component>
			<span v-if="idx < steps.length - 1"
				class="cn-stepper__connector cn-wizard-dialog__progress-connector"
				:class="{
					'cn-stepper__connector--done': idx < currentIndex,
					'cn-wizard-dialog__progress-connector--done': idx < currentIndex,
				}"
				aria-hidden="true" />
		</li>
	</ol>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import Check from 'vue-material-design-icons/Check.vue'
import { useLook } from '../../composables/useLook.js'

/**
 * CnStepper (internal) - the step indicator of a wizard: an ordered list, the
 * current step marked with `aria-current="step"`, finished steps as real
 * buttons only when `allowJumpBack` is set.
 *
 * In the board look (`look="board"`, else the injected `cnLook`) it draws 28px
 * circles with the label beside them, a green check on a finished step, a
 * filled circle on the current one, an outlined circle on the rest and a 2px
 * connector coloured by state. In the Nextcloud look it draws the stacked
 * stepper CnWizardDialog always had, with the same class names.
 *
 * @spec openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md#requirement-the-board-stepper
 * @event jump Emitted with a finished step's id when its button is pressed.
 *
 * @event jump Emitted with the step id when a finished step button is pressed.
 */
export default {
	name: 'CnStepper',

	components: { Check },

	props: {
		/** The steps: `{ id, label }`. */
		steps: { type: Array, required: true },
		/** Index of the current step. */
		currentIndex: { type: Number, default: 0 },
		/** Let a finished step be pressed to go back to it. */
		allowJumpBack: { type: Boolean, default: false },
		/** The look; unset follows the injected `cnLook`. */
		look: { type: String, default: undefined },
		/** Accessible name of the list. */
		ariaLabel: { type: String, default: () => t('nextcloud-vue', 'Steps') },
		/** Visually hidden text after a finished step's label. */
		completedLabel: { type: String, default: () => t('nextcloud-vue', 'completed') },
	},

	emits: ['jump'],

	setup(props) {
		const { isBoard, lookClass } = useLook(props)
		return { isBoard, lookClass }
	},

	methods: {
		/**
		 * Forward a press on a finished step.
		 *
		 * @param {string} id The step id.
		 */
		onJump(id) {
			/**
			 * @event jump Emitted with the step id when a finished step button is pressed.
			 */
			this.$emit('jump', id)
		},

		isJumpable(idx) {
			return this.allowJumpBack && idx < this.currentIndex
		},
	},
}
</script>

<style scoped>
/* The Nextcloud look: the stacked stepper, unchanged. */
.cn-stepper {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: 0;
	padding: 8px 0 4px;
	margin: 0 0 20px;
	list-style: none;
}

.cn-stepper__item {
	position: relative;
	flex: 1 1 0;
	min-width: 0;
	max-width: 180px;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-size: 0.8125rem;
}

.cn-stepper__step {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	max-width: 100%;
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
}

button.cn-stepper__step {
	cursor: pointer;
}

.cn-stepper__dot {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	border: 2px solid var(--color-border-dark);
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	font-weight: 600;
	transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	z-index: 1;
}

.cn-wizard-dialog__progress-check {
	font-size: 16px;
	line-height: 1;
}

.cn-stepper__label {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-stepper__connector {
	position: absolute;
	top: 17px;
	left: calc(50% + 21px);
	right: calc(-50% + 21px);
	height: 2px;
	background: var(--color-border-dark);
}

.cn-stepper__connector--done {
	background: var(--color-primary-element);
}

.cn-stepper__item--current .cn-stepper__dot,
.cn-stepper__item--done .cn-stepper__dot {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
}

.cn-stepper__item--current .cn-stepper__label {
	color: var(--color-main-text);
	font-weight: 600;
}

.cn-stepper__item--done .cn-stepper__label {
	color: var(--color-main-text);
}

.cn-stepper__item--done button.cn-stepper__step:hover .cn-stepper__label {
	color: var(--color-primary-element);
}

.cn-stepper__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

/* The board look: one row, 28px circles, the label beside the circle. */
.cn-stepper--board {
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
	padding: 0;
	margin: 0;
}

.cn-stepper--board .cn-stepper__item {
	flex: 0 1 auto;
	flex-direction: row;
	align-items: center;
	gap: 8px;
	max-width: none;
	font-size: 14px;
}

.cn-stepper--board .cn-stepper__item:not(:last-child) {
	flex: 1 1 auto;
}

.cn-stepper--board .cn-stepper__step {
	flex-direction: row;
	gap: 8px;
}

.cn-stepper--board .cn-stepper__dot {
	flex: 0 0 auto;
	width: 28px;
	height: 28px;
	font-size: 14px;
}

.cn-stepper--board .cn-stepper__label {
	overflow: visible;
	text-overflow: clip;
	white-space: nowrap;
	font-size: 14px;
}

.cn-stepper--board .cn-stepper__connector {
	position: static;
	flex: 1 1 24px;
	min-width: 16px;
	height: 2px;
	background: var(--color-border);
}

.cn-stepper--board .cn-stepper__connector--done {
	background: var(--color-success);
}

/* Done: filled success circle, 16px check, secondary label. */
.cn-stepper--board .cn-stepper__item--done .cn-stepper__dot {
	border-color: var(--color-success);
	background: var(--color-success);
	color: var(--color-success-text, #fff);
}

.cn-stepper--board .cn-stepper__item--done .cn-stepper__label {
	color: var(--cn-board-text-soft, var(--color-main-text));
	font-weight: 400;
}

/* Current: filled primary, number 14/700, label 14/700 in the main text colour. */
.cn-stepper--board .cn-stepper__item--current .cn-stepper__dot {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
	font-weight: 700;
}

.cn-stepper--board .cn-stepper__item--current .cn-stepper__label {
	color: var(--color-main-text);
	font-weight: 700;
}

/* Upcoming: 2px outline, number 14/600, label in the max-contrast tone. */
.cn-stepper--board .cn-stepper__item--upcoming .cn-stepper__dot {
	border: 2px solid var(--color-border-dark);
	background: transparent;
	color: var(--color-text-maxcontrast);
	font-weight: 600;
}

.cn-stepper--board .cn-stepper__item--upcoming .cn-stepper__label {
	color: var(--color-text-maxcontrast);
}
</style>
