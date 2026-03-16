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
			class="cn-timeline-stages__stage"
			:class="stageClasses(index)"
			role="listitem"
			:aria-current="stageState(index) === 'current' ? 'step' : undefined"
			:tabindex="clickable ? (focusedIndex === index ? 0 : -1) : undefined"
			@click="onStageClick(stage, index)"
			@keydown="onKeydown($event, stage, index)">
			<!-- Indicator -->
			<slot
				name="indicator"
				:stage="stage"
				:index="index"
				:state="stageState(index)">
				<span class="cn-timeline-stages__indicator">
					<svg
						v-if="stageState(index) === 'completed'"
						class="cn-timeline-stages__check"
						viewBox="0 0 24 24"
						aria-hidden="true">
						<path
							fill="currentColor"
							d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
					</svg>
				</span>
			</slot>

			<!-- Label + Subtitle -->
			<slot
				name="label"
				:stage="stage"
				:index="index"
				:state="stageState(index)">
				<span class="cn-timeline-stages__content">
					<span class="cn-timeline-stages__label">{{ stage.label }}</span>
					<span
						v-if="stage.subtitle"
						class="cn-timeline-stages__subtitle">
						{{ stage.subtitle }}
					</span>
				</span>
			</slot>
		</div>
	</div>
</template>

<script>
/**
 * CnTimelineStages — Visual timeline/stepper for sequential stage progression.
 *
 * Renders a sequence of named stages with visual indicators for completed,
 * current, and upcoming states. Supports horizontal and vertical orientations,
 * click interaction, keyboard navigation, and scoped slots for customization.
 *
 * @example
 * <CnTimelineStages
 *   :stages="[{ id: 1, label: 'New' }, { id: 2, label: 'In Progress' }, { id: 3, label: 'Done' }]"
 *   :current-stage="2" />
 *
 * @example
 * <!-- Vertical, clickable, small -->
 * <CnTimelineStages
 *   :stages="stages"
 *   :current-stage="activeId"
 *   orientation="vertical"
 *   :clickable="true"
 *   size="small"
 *   v-on:stage-click="onStageClick" />
 */
export default {
	name: 'CnTimelineStages',

	props: {
		/**
		 * Array of stage objects. Order determines sequence.
		 * Each stage must have an `id` and `label`. Optional: `subtitle`, `icon`.
		 */
		stages: {
			type: Array,
			required: true,
			validator: (v) => v.every((s) => s.id !== undefined && s.label !== undefined),
		},
		/**
		 * ID of the currently active stage. Stages before this are "completed",
		 * stages after are "upcoming". If null, all stages are "upcoming".
		 */
		currentStage: {
			type: [String, Number],
			default: null,
		},
		/** Layout direction: 'horizontal' or 'vertical' */
		orientation: {
			type: String,
			default: 'horizontal',
			validator: (v) => ['horizontal', 'vertical'].includes(v),
		},
		/** Whether stage nodes are clickable */
		clickable: {
			type: Boolean,
			default: false,
		},
		/** Size variant: 'small' or 'medium' */
		size: {
			type: String,
			default: 'medium',
			validator: (v) => ['small', 'medium'].includes(v),
		},
		/** Accessible label for the timeline */
		ariaLabel: {
			type: String,
			default: 'Progress stages',
		},
	},

	data() {
		return {
			focusedIndex: 0,
		}
	},

	computed: {
		currentIndex() {
			if (this.currentStage === null || this.currentStage === undefined) {
				return -1
			}
			const idx = this.stages.findIndex((s) => s.id === this.currentStage)
			return idx
		},

		rootClasses() {
			return {
				'cn-timeline-stages': true,
				'cn-timeline-stages--horizontal': this.orientation === 'horizontal',
				'cn-timeline-stages--vertical': this.orientation === 'vertical',
				'cn-timeline-stages--small': this.size === 'small',
				'cn-timeline-stages--clickable': this.clickable,
			}
		},
	},

	mounted() {
		this.scrollCurrentIntoView()
	},

	methods: {
		/**
		 * Derive state for a stage at a given index.
		 * @param {number} index - Stage index
		 * @return {'completed'|'current'|'upcoming'}
		 */
		stageState(index) {
			if (this.currentIndex < 0) return 'upcoming'
			if (index < this.currentIndex) return 'completed'
			if (index === this.currentIndex) return 'current'
			return 'upcoming'
		},

		stageClasses(index) {
			const state = this.stageState(index)
			return {
				['cn-timeline-stages__stage--' + state]: true,
			}
		},

		onStageClick(stage, index) {
			if (!this.clickable) return
			this.$emit('stage-click', { stage, index })
		},

		onKeydown(event, stage, index) {
			if (!this.clickable) return

			const isHorizontal = this.orientation === 'horizontal'
			const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
			const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

			if (event.key === nextKey) {
				event.preventDefault()
				this.moveFocus(index + 1)
			} else if (event.key === prevKey) {
				event.preventDefault()
				this.moveFocus(index - 1)
			} else if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				this.$emit('stage-click', { stage, index })
			}
		},

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

		scrollCurrentIntoView() {
			if (this.currentIndex < 0 || this.orientation !== 'horizontal') return
			this.$nextTick(() => {
				const nodes = this.$refs.stageNodes
				if (nodes && nodes[this.currentIndex]) {
					nodes[this.currentIndex].scrollIntoView({
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
