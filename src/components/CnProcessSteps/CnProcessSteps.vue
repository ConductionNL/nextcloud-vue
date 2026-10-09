<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<nav class="cn-process-steps denhaag-process-steps" :aria-label="label">
		<ol class="denhaag-process-steps__list">
			<li
				v-for="step in steps"
				:key="step.id"
				class="denhaag-process-steps__step"
				:class="stepClasses(step)"
				:aria-current="stateOf(step) === 'current' ? 'step' : null">
				<button
					v-if="isNavigable(step)"
					type="button"
					class="denhaag-process-steps__link"
					@click="$emit('select', step.id)">
					<span class="denhaag-process-steps__marker" aria-hidden="true">{{ marker(step) }}</span>
					<span class="denhaag-process-steps__label">{{ step.label }}</span>
					<span class="cn-process-steps__state">{{ stateText(step) }}</span>
				</button>
				<span v-else class="denhaag-process-steps__heading">
					<span class="denhaag-process-steps__marker" aria-hidden="true">{{ marker(step) }}</span>
					<span class="denhaag-process-steps__label">{{ step.label }}</span>
					<span class="cn-process-steps__state">{{ stateText(step) }}</span>
				</span>
				<ol v-if="step.children && step.children.length" class="denhaag-process-steps__sub-steps">
					<li
						v-for="child in step.children"
						:key="child.id"
						class="denhaag-process-steps__sub-step"
						:class="stepClasses(child)"
						:aria-current="stateOf(child) === 'current' ? 'step' : null">
						<button
							v-if="isNavigable(child)"
							type="button"
							class="denhaag-process-steps__link"
							@click="$emit('select', child.id)">
							<span class="denhaag-process-steps__label">{{ child.label }}</span>
							<span class="cn-process-steps__state">{{ stateText(child) }}</span>
						</button>
						<span v-else class="denhaag-process-steps__heading">
							<span class="denhaag-process-steps__label">{{ child.label }}</span>
							<span class="cn-process-steps__state">{{ stateText(child) }}</span>
						</span>
					</li>
				</ol>
			</li>
		</ol>
	</nav>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnProcessSteps — the step indicator of a journey, in NL Design markup
 * (`denhaag-process-steps` classes; token values come from the active theme
 * through Nextcloud's own CSS variables, so the nldesign app re-themes it).
 *
 * Each step is a `{ id, label, number?, children?, navigable? }`. The current
 * step is the one whose id equals `current`; steps before it are completed,
 * steps after it are upcoming. State is announced as text and `aria-current`,
 * not carried by colour alone. A group (`children`) shows its sub-steps one
 * level deep and is a button unless `navigable` is false.
 *
 * Example:
 * ```vue
 * <CnProcessSteps :steps="steps" current="address" @select="goTo" />
 * ```
 */
export default {
	name: 'CnProcessSteps',

	props: {
		/**
		 * The steps to show. A step with `children` is a group; `navigable: false` makes it a heading only.
		 *
		 * @type {Array<{id: string, label: string, number?: number, navigable?: boolean, children?: Array<{id: string, label: string}>}>}
		 */
		steps: {
			type: Array,
			default: () => [],
		},

		/** Id of the current step (or sub-step); steps before it are completed. */
		current: {
			type: String,
			default: '',
		},

		/** Accessible name of the indicator. */
		label: {
			type: String,
			default: () => t('nextcloud-vue', 'Progress'),
		},
	},

	emits: [
		/** Emitted when the user picks a step; payload is the step id. */
		'select',
	],

	computed: {
		order() {
			const ids = []
			for (const step of this.steps) {
				ids.push(step.id)
				for (const child of step.children || []) {
					ids.push(child.id)
				}
			}
			return ids
		},
	},

	methods: {
		isNavigable(step) {
			return step.navigable !== false
		},

		stateOf(step) {
			const own = this.order.indexOf(step.id)
			const now = this.order.indexOf(this.current)
			const childIds = (step.children || []).map((c) => c.id)
			if (this.current === step.id || childIds.includes(this.current)) {
				return 'current'
			}
			if (now < 0) {
				return 'upcoming'
			}
			return own < now ? 'completed' : 'upcoming'
		},

		stepClasses(step) {
			const state = this.stateOf(step)
			return {
				'denhaag-process-steps__step--current': state === 'current',
				'denhaag-process-steps__step--checked': state === 'completed',
				'denhaag-process-steps__step--upcoming': state === 'upcoming',
			}
		},

		stateText(step) {
			const state = this.stateOf(step)
			if (state === 'current') {
				return t('nextcloud-vue', '(current step)')
			}
			return state === 'completed' ? t('nextcloud-vue', '(completed)') : t('nextcloud-vue', '(upcoming)')
		},

		marker(step) {
			return this.stateOf(step) === 'completed' ? '✓' : String(step.number ?? this.steps.indexOf(step) + 1)
		},
	},
}
</script>

<style scoped>
.denhaag-process-steps__list,
.denhaag-process-steps__sub-steps {
	list-style: none;
	margin: 0;
	padding: 0;
}

.denhaag-process-steps__list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 24px;
}

.denhaag-process-steps__sub-steps {
	margin-top: 4px;
	padding-inline-start: 32px;
}

.denhaag-process-steps__link,
.denhaag-process-steps__heading {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 4px 0;
	background: none;
	border: 0;
	color: var(--color-main-text);
	font: inherit;
}

.denhaag-process-steps__link {
	cursor: pointer;
}

.denhaag-process-steps__marker {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: 2px solid var(--color-border-maxcontrast);
	border-radius: 50%;
}

.denhaag-process-steps__step--current > .denhaag-process-steps__link,
.denhaag-process-steps__step--current > .denhaag-process-steps__heading {
	font-weight: bold;
}

.denhaag-process-steps__step--current > * > .denhaag-process-steps__marker {
	background: var(--color-primary-element);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.denhaag-process-steps__step--checked > * > .denhaag-process-steps__marker {
	border-color: var(--color-primary-element);
	color: var(--color-primary-element);
}

.denhaag-process-steps__step--upcoming {
	color: var(--color-text-maxcontrast);
}

.cn-process-steps__state {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
