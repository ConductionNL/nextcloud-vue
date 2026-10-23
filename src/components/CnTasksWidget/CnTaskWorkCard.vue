<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnTaskWorkCard — one open flow task to work on in place: its title, number,
  handler, deadline and lock, who it is offered to, its form inline, and its
  verbs. CnTasksWidget draws it for the first open task (`variant: "focus"`)
  and under a table row that is opened (`expandRows`). It runs nothing
  itself: it emits the verb and the widget posts it.
-->
<template>
	<div class="cn-task-work-card" :data-testid="`${idPrefix}-work`">
		<component :is="innerHeadingTag" class="cn-task-work-card__title cn-inner-heading" :data-testid="`${idPrefix}-work-title`">
			<router-link v-if="openRoute && $router" :to="openRoute" class="cn-task-work-card__link">
				{{ title }}
			</router-link>
			<template v-else>
				{{ title }}
			</template>
		</component>
		<dl class="cn-task-work-card__meta">
			<dt>{{ tr('Reference') }}</dt>
			<dd :data-testid="`${idPrefix}-work-reference`">
				{{ referenceLabel }}
			</dd>
			<dt>{{ tr('Assignee') }}</dt>
			<dd :data-testid="`${idPrefix}-work-assignee`">
				{{ task.assignee ? handlerName : tr('Unassigned') }}
			</dd>
			<dt>{{ tr('Due') }}</dt>
			<dd :data-testid="`${idPrefix}-work-due`">
				{{ dueLabel || tr('No due date') }}
			</dd>
			<dt>{{ tr('Lock') }}</dt>
			<dd :data-testid="`${idPrefix}-work-lock`">
				{{ lockLabel }}
			</dd>
		</dl>
		<p v-if="candidatesLabel" class="cn-task-work-card__candidates" :data-testid="`${idPrefix}-work-candidates`">
			{{ candidatesLabel }}
		</p>
		<CnTaskFormFields
			v-if="form"
			:form="form"
			:values="values"
			:idPrefix="`${idPrefix}-work-form`"
			@answer="$emit('answer', $event)" />
		<div class="cn-task-work-card__actions">
			<NcButton
				v-if="claimable"
				:disabled="busy"
				variant="secondary"
				:data-testid="`${idPrefix}-work-claim`"
				@click="$emit('claim')">
				{{ tr('Claim') }}
			</NcButton>
			<NcButton
				:disabled="busy"
				variant="primary"
				:data-testid="`${idPrefix}-work-complete`"
				@click="$emit('complete')">
				{{ tr('Complete') }}
			</NcButton>
			<NcButton
				v-if="cancelable"
				:disabled="busy"
				variant="secondary"
				:data-testid="`${idPrefix}-work-cancel`"
				@click="$emit('cancel')">
				{{ tr('Cancel task') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CnTaskFormFields from '../CnTaskFormFields/CnTaskFormFields.vue'
import { taskDueLabel } from '../../composables/indexSources.js'
import innerHeading from '../../mixins/innerHeading.js'
import { taskCandidates, taskForm, taskIsOffered, taskLock, taskReference } from '../../utils/flowTask.js'
import { userDisplayName } from '../../utils/userDisplayName.js'

export default {
	name: 'CnTaskWorkCard',

	components: { CnTaskFormFields, NcButton },

	mixins: [innerHeading],

	props: {
		/** The task row. */
		task: { type: Object, required: true },
		/** The answers to its form so far, keyed by field. */
		values: { type: Object, default: () => ({}) },
		/** Offer Claim. */
		claimable: { type: Boolean, default: false },
		/** Whether this instance can claim at all, which sets the candidates sentence. */
		claimAvailable: { type: Boolean, default: true },
		/** Offer Cancel task. */
		cancelable: { type: Boolean, default: false },
		/** A verb is in flight. */
		busy: { type: Boolean, default: false },
		/** Where the title links to (the task page), or null. */
		openRoute: { type: Object, default: null },
		/** The widget's translate function. */
		tr: { type: Function, required: true },
		/** Prefix of the test ids. */
		idPrefix: { type: String, default: 'cn-tasks-widget' },
	},

	emits: ['answer', 'claim', 'complete', 'cancel'],

	computed: {
		/** @return {string} The title, "Task" for an untitled one. */
		title() {
			return String(this.task.displayTitle || this.task.title || '').trim() || this.tr('Task')
		},

		/** @return {string} The number, or the uuid said to have no number yet. */
		referenceLabel() {
			const reference = taskReference(this.task)
			if (reference.value === '') {
				return this.tr('No number yet')
			}
			return reference.isNumber ? reference.value : this.tr('{id} (no number yet)').replace('{id}', reference.value)
		},

		/** @return {string} The handler's display name. */
		handlerName() {
			return userDisplayName(this.task.assignee) || String(this.task.assignee)
		},

		/** @return {string} The deadline in words. */
		dueLabel() {
			return taskDueLabel(this.task)
		},

		/**
		 * Locked, open, or not tracked: the engine tracks no lock on most
		 * tasks, and "open" there would claim a fact nothing knows.
		 *
		 * @return {string}
		 */
		lockLabel() {
			const lock = taskLock(this.task)
			if (lock === null) {
				return this.tr('Not tracked')
			}
			return lock ? this.tr('Locked') : this.tr('Not locked')
		},

		/**
		 * Who the task is offered to, when nobody holds it. Where this
		 * instance cannot claim, it says to assign the task instead.
		 *
		 * @return {string}
		 */
		candidatesLabel() {
			if (!taskIsOffered(this.task)) {
				return ''
			}
			const candidates = taskCandidates(this.task).join(', ')
			const sentence = this.claimAvailable
				? this.tr('Waiting for someone from {candidates}')
				: this.tr('Meant for {candidates}. Nobody can claim it here yet, so assign it to someone.')
			return sentence.replace('{candidates}', candidates)
		},

		/** @return {object|null} The task's form. */
		form() {
			return taskForm(this.task)
		},
	},
}
</script>

<style scoped>
.cn-task-work-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
}

.cn-task-work-card__title {
	margin: 0;
	font-size: 15px;
}

.cn-task-work-card__link {
	color: inherit;
	text-decoration: underline;
}

.cn-task-work-card__meta {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 4px 12px;
	margin: 0;
}

.cn-task-work-card__meta dt {
	color: var(--color-text-maxcontrast);
}

.cn-task-work-card__meta dd {
	margin: 0;
}

.cn-task-work-card__candidates {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-task-work-card__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
</style>
