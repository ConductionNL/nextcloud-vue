<!--
  CnTimelineStages — Visualizes sequential progression through named stages.

  Used in case management, pipeline tracking, and any workflow with discrete
  phases. Supports horizontal/vertical orientation, small/medium sizes,
  clickable interaction, keyboard navigation (roving tabindex), and ARIA roles.

  All colors use Nextcloud CSS variables so NL Design System theming
  applies automatically.
-->
<template>
	<div
		v-if="stages.length > 0"
		:class="rootClasses"
		role="list"
		:aria-label="ariaLabel">
		<div
			v-for="(stage, index) in stages"
			:key="stage.id"
			ref="stageNodes"
			:class="stageClasses(index)"
			role="listitem"
			:aria-current="stageStates[index] === 'current' ? 'step' : undefined"
			:tabindex="clickable ? (focusedIndex === index ? 0 : -1) : undefined"
			@click="onStageClick(stage, index)"
			@keydown="onKeydown($event, stage, index)">
			<!-- Indicator -->
			<slot
				name="indicator"
				:stage="stage"
				:index="index"
				:state="stageStates[index]">
				<span class="cn-timeline-stages__indicator">
					<!-- Completed: checkmark SVG -->
					<svg
						v-if="stageStates[index] === 'completed'"
						aria-hidden="true"
						viewBox="0 0 24 24"
						class="cn-timeline-stages__checkmark">
						<path
							fill="currentColor"
							d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
					</svg>
					<!-- Current: filled dot -->
					<span
						v-else-if="stageStates[index] === 'current'"
						class="cn-timeline-stages__dot" />
				</span>
			</slot>
			<!-- Label + Subtitle -->
			<slot
				name="label"
				:stage="stage"
				:index="index"
				:state="stageStates[index]">
				<span class="cn-timeline-stages__label">
					{{ stage.label }}
				</span>
				<span
					v-if="stage.subtitle"
					class="cn-timeline-stages__subtitle">
					{{ stage.subtitle }}
				</span>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnTimelineStages — Timeline/progress stages component.
 *
 * Renders a sequence of named stages with completed/current/upcoming states,
 * connected by a track line. Supports horizontal and vertical layout,
 * small and medium sizes, clickable stages, keyboard navigation, and ARIA roles.
 *
 * Basic horizontal timeline
 * ```vue
 * <CnTimelineStages
 *   :stages="[
 *     { id: 'new', label: 'New' },
 *     { id: 'review', label: 'Review', subtitle: 'Mar 15' },
 *     { id: 'done', label: 'Done' },
 *   ]"
 *   currentStage="review" />
 * ```
 *
 * Vertical clickable timeline
 * ```vue
 * <CnTimelineStages
 *   :stages="pipelineStages"
 *   :currentStage="deal.stage"
 *   orientation="vertical"
 *   :clickable="true"
 *   v-on:stage-click="onStageClick" />
 * ```
 */
export default {
	name: 'CnTimelineStages',

	props: {
		/**
		 * Array of stage objects. Each must have `id` (unique) and `label` (display text).
		 * Optional `subtitle` for secondary text below the label.
		 */
		stages: {
			type: Array,
			required: true,
			validator: (stages) => stages.every((s) => s.id !== undefined && s.label !== undefined),
		},
		/**
		 * The `id` of the currently active stage. Stages before it are "completed",
		 * stages after it are "upcoming". If null/undefined or not matching any id,
		 * all stages are "upcoming".
		 * @type {string|number|null}
		 */
		currentStage: {
			type: [String, Number],
			default: null,
		},
		/**
		 * Layout orientation: "horizontal" (left-to-right) or "vertical" (top-to-bottom).
		 * @type {string}
		 */
		orientation: {
			type: String,
			default: 'horizontal',
			validator: (v) => ['horizontal', 'vertical'].includes(v),
		},
		/**
		 * Size variant: "medium" (32px indicators) or "small" (20px indicators).
		 * @type {string}
		 */
		size: {
			type: String,
			default: 'medium',
			validator: (v) => ['small', 'medium'].includes(v),
		},
		/**
		 * Whether stages are clickable. When true, stages emit `stage-click`
		 * on click/Enter/Space and support keyboard navigation with arrow keys.
		 * @type {boolean}
		 */
		clickable: {
			type: Boolean,
			default: false,
		},
		/**
		 * Accessible label for the timeline container.
		 * @type {string}
		 */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Progress stages'),
		},
	},

	data() {
		return {
			/** @type {number} Index of the currently focused stage (roving tabindex) */
			focusedIndex: 0,
		}
	},

	computed: {
		/**
		 * Root element CSS classes based on orientation and size props.
		 * @return {object}
		 */
		rootClasses() {
			return {
				'cn-timeline-stages': true,
				'cn-timeline-stages--horizontal': this.orientation === 'horizontal',
				'cn-timeline-stages--vertical': this.orientation === 'vertical',
				'cn-timeline-stages--small': this.size === 'small',
				'cn-timeline-stages--clickable': this.clickable,
			}
		},
		/**
		 * Index of the current stage in the stages array, or -1 if not found.
		 * @return {number}
		 */
		currentStageIndex() {
			if (this.currentStage == null) return -1
			return this.stages.findIndex((s) => s.id === this.currentStage)
		},
		/**
		 * Pre-calculated states for all stages to avoid repeated stageState() calls in template.
		 * @return {Array<'completed'|'current'|'upcoming'>}
		 */
		stageStates() {
			return this.stages.map((stage, index) => this.stageState(index))
		},
	},

	mounted() {
		this.scrollCurrentIntoView()
	},

	methods: {
		/**
		 * Derive the visual state of a stage by its index.
		 * @param {number} index Stage index
		 * @return {'completed'|'current'|'upcoming'}
		 */
		stageState(index) {
			if (this.currentStageIndex === -1) return 'upcoming'
			if (index < this.currentStageIndex) return 'completed'
			if (index === this.currentStageIndex) return 'current'
			return 'upcoming'
		},
		/**
		 * CSS classes for a stage node.
		 * @param {number} index Stage index
		 * @return {object}
		 */
		stageClasses(index) {
			const state = this.stageState(index)
			return {
				'cn-timeline-stages__stage': true,
				[`cn-timeline-stages__stage--${state}`]: true,
			}
		},
		/**
		 * Handle click on a stage node.
		 * @param {object} stage The stage object
		 * @param {number} index The stage index
		 */
		onStageClick(stage, index) {
			if (!this.clickable) return
			/**
			 * Emitted when a clickable stage is activated (click, Enter, or Space).
			 * @event stage-click
			 * @type {{ stage: object, index: number }}
			 */
			this.$emit('stage-click', { stage, index })
		},
		/**
		 * Keyboard handler for arrow keys, Enter, and Space.
		 * Implements roving tabindex pattern.
		 * @param {KeyboardEvent} event The keyboard event
		 * @param {object} stage The stage object
		 * @param {number} index The stage index
		 */
		onKeydown(event, stage, index) {
			if (!this.clickable) return

			const isHorizontal = this.orientation === 'horizontal'
			const nextKeys = isHorizontal ? ['ArrowRight'] : ['ArrowDown']
			const prevKeys = isHorizontal ? ['ArrowLeft'] : ['ArrowUp']

			if (nextKeys.includes(event.key)) {
				event.preventDefault()
				this.moveFocus(index + 1)
			} else if (prevKeys.includes(event.key)) {
				event.preventDefault()
				this.moveFocus(index - 1)
			} else if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				this.$emit('stage-click', { stage, index })
			}
		},
		/**
		 * Move focus to a new stage index (roving tabindex).
		 * @param {number} newIndex Target index
		 */
		moveFocus(newIndex) {
			if (newIndex < 0 || newIndex >= this.stages.length) return
			this.focusedIndex = newIndex
			this.$nextTick(() => {
				const nodes = this.$refs.stageNodes
				if (nodes && nodes[newIndex]) {
					nodes[newIndex].focus()
				}
			})
		},
		/**
		 * Scroll the current stage into view on mount (horizontal overflow).
		 */
		scrollCurrentIntoView() {
			if (this.orientation !== 'horizontal' || this.currentStageIndex === -1) return
			this.$nextTick(() => {
				const nodes = this.$refs.stageNodes
				if (nodes && nodes[this.currentStageIndex]) {
					nodes[this.currentStageIndex].scrollIntoView({
						behavior: 'smooth',
						block: 'nearest',
						inline: 'center',
					})
				}
			})
		},
	},
}
</script>
