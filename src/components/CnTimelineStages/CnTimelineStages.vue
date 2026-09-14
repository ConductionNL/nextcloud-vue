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
			:title="stageHint(index)"
			:aria-current="stageStates[index] === 'current' ? 'step' : undefined"
			:aria-disabled="clickable && stage.disabled ? 'true' : undefined"
			:tabindex="clickable ? (focusedIndex === index ? 0 : -1) : undefined"
			@click="onStageClick(stage, index)"
			@keydown="onKeydown($event, stage, index)">
			<!-- Indicator: wrapper provides consistent 32px (or 20px for small) circle.
			     Slot replaces only the inner content, so custom indicators inherit sizing. -->
			<span class="cn-timeline-stages__indicator">
				<slot
					name="indicator"
					:stage="stage"
					:index="index"
					:state="stageStates[index]">
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
					<!-- Refused: an exclamation mark. The warning colour alone
					     would leave a colour-blind reader with a stage that
					     looks like every other one it cannot reach, so the
					     refusal carries a shape too (WCAG 2.2 AA, 1.4.1). -->
					<svg
						v-else-if="stageBlocked(index)"
						aria-hidden="true"
						viewBox="0 0 24 24"
						class="cn-timeline-stages__alert">
						<path
							fill="currentColor"
							d="M11 7h2v7h-2V7m0 9h2v2h-2v-2Z" />
					</svg>
				</slot>
			</span>
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
		 * Optional `subtitle` for secondary text below the label. Optional
		 * `disabled` marks a stage that cannot be chosen: in clickable mode it
		 * keeps its focus stop, carries `aria-disabled="true"` and emits
		 * `stage-blocked` instead of `stage-click`, so the consumer can tell
		 * the person why nothing happened.
		 *
		 * Optional `blocked` says WHY it cannot be chosen: a guard refused this
		 * record, rather than the stage merely sitting further down the process.
		 * Those are different claims and they must not look alike, so a blocked
		 * stage keeps full contrast and takes the warning colour and an
		 * exclamation mark, where a merely-upcoming one stays dimmed. Set it on
		 * the stages a guard actually refused: if every stage is orange, none of
		 * them reads as refused.
		 *
		 * Optional `hint` is the explanation, put on the stage's `title` so a
		 * mouse-over reveals it. It is the pointer route to a reason that is not
		 * printed on screen; it is not the only route, because a tooltip reaches
		 * neither touch nor keyboard.
		 *
		 * @type {{ id: string, label: string, subtitle?: string, disabled?: boolean, blocked?: boolean, hint?: string }[]}
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
		 *
		 * @type {string|number|null}
		 */
		currentStage: {
			type: [String, Number],
			default: null,
		},

		/**
		 * Layout orientation: "horizontal" (left-to-right) or "vertical" (top-to-bottom).
		 *
		 * @type {string}
		 */
		orientation: {
			type: String,
			default: 'horizontal',
			validator: (v) => ['horizontal', 'vertical'].includes(v),
		},

		/**
		 * Size variant: "medium" (32px indicators) or "small" (20px indicators).
		 *
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
		 *
		 * @type {boolean}
		 */
		clickable: {
			type: Boolean,
			default: false,
		},

		/**
		 * Accessible label for the timeline container.
		 *
		 * @type {string}
		 */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Progress stages'),
		},
	},

	emits: ['stage-click', 'stage-blocked'],

	data() {
		return {
			/** @type {number} Index of the currently focused stage (roving tabindex) */
			focusedIndex: 0,
		}
	},

	computed: {
		/**
		 * Root element CSS classes based on orientation and size props.
		 *
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
		 *
		 * @return {number}
		 */
		currentStageIndex() {
			if (this.currentStage === null || this.currentStage === undefined) {
				return -1
			}
			return this.stages.findIndex((s) => s.id === this.currentStage)
		},

		/**
		 * Pre-calculated states for all stages to avoid repeated stageState() calls in template.
		 *
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
		 *
		 * @param {number} index Stage index
		 * @return {'completed'|'current'|'upcoming'}
		 */
		stageState(index) {
			if (this.currentStageIndex === -1) {
				return 'upcoming'
			}
			if (index < this.currentStageIndex) {
				return 'completed'
			}
			if (index === this.currentStageIndex) {
				return 'current'
			}
			return 'upcoming'
		},

		/**
		 * CSS classes for a stage node.
		 *
		 * @param {number} index Stage index
		 * @return {object}
		 */
		stageClasses(index) {
			const state = this.stageState(index)
			return {
				'cn-timeline-stages__stage': true,
				[`cn-timeline-stages__stage--${state}`]: true,
				'cn-timeline-stages__stage--disabled': this.clickable && this.stages[index]?.disabled === true,
				'cn-timeline-stages__stage--blocked': this.stageBlocked(index),
			}
		},

		/**
		 * Whether a stage reads as REFUSED rather than merely later in the
		 * process. A guard said no about this record, which is the one case that
		 * earns colour.
		 *
		 * The stage the record is ON is never refused, whatever the consumer
		 * passes: painting a refusal on the place the record already sits would
		 * say no to a move nobody is making. `CnStagesWidget` never marks it,
		 * and this refuses it again, because a lie about the current stage is
		 * the one that would be believed.
		 *
		 * @param {number} index Stage index
		 * @return {boolean} Whether the stage is refused.
		 */
		stageBlocked(index) {
			return this.clickable
				&& this.stages[index]?.blocked === true
				&& this.stageState(index) !== 'current'
		},

		/**
		 * The stage's explanation, for the `title` attribute.
		 *
		 * Returns undefined rather than an empty string, so a stage with nothing
		 * to explain renders no `title` at all instead of an empty tooltip.
		 *
		 * @param {number} index Stage index
		 * @return {string|undefined} The hint, or undefined when there is none.
		 */
		stageHint(index) {
			const hint = this.stages[index]?.hint
			return (typeof hint === 'string' && hint !== '') ? hint : undefined
		},

		/**
		 * Handle click on a stage node.
		 *
		 * @param {object} stage The stage object
		 * @param {number} index The stage index
		 */
		onStageClick(stage, index) {
			if (!this.clickable) {
				return
			}
			if (stage.disabled === true) {
				/**
				 * Emitted when a stage that cannot be chosen is activated.
				 *
				 * The stage still emits no `stage-click`, so nothing acts on it.
				 * This says the person TRIED, which is what lets a consumer
				 * answer them. Without it a blocked stage was silent to anyone
				 * not running a screen reader: no message, no move, nothing.
				 *
				 * @event stage-blocked
				 * @type {{ stage: object, index: number }}
				 */
				this.$emit('stage-blocked', { stage, index })
				return
			}
			/**
			 * Emitted when a clickable stage is activated (click, Enter, or Space).
			 *
			 * @event stage-click
			 * @type {{ stage: object, index: number }}
			 */
			this.$emit('stage-click', { stage, index })
		},

		/**
		 * Keyboard handler for arrow keys, Enter, and Space.
		 * Implements roving tabindex pattern.
		 *
		 * @param {KeyboardEvent} event The keyboard event
		 * @param {object} stage The stage object
		 * @param {number} index The stage index
		 */
		onKeydown(event, stage, index) {
			if (!this.clickable) {
				return
			}

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
				// A disabled stage keeps its focus stop, so a screen reader can
				// reach it and read why, but it cannot be chosen. The attempt
				// is still reported, so the consumer can answer it.
				if (stage.disabled === true) {
					this.$emit('stage-blocked', { stage, index })
					return
				}
				this.$emit('stage-click', { stage, index })
			}
		},

		/**
		 * Move focus to a new stage index (roving tabindex).
		 *
		 * @param {number} newIndex Target index
		 */
		moveFocus(newIndex) {
			if (newIndex < 0 || newIndex >= this.stages.length) {
				return
			}
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
			if (this.orientation !== 'horizontal' || this.currentStageIndex === -1) {
				return
			}
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
