<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		v-if="open"
		:name="journey.title || t('nextcloud-vue', 'Journey')"
		size="large"
		@closing="onClosing">
		<CnJourney
			:journey="journey"
			:runId="runId"
			:store="runStore"
			:submitLabel="submitLabel"
			@runStarted="$emit('run-started', $event)"
			@step="$emit('step', $event)"
			@submitted="onSubmitted" />
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog } from '@nextcloud/vue'
import CnJourney from '../CnJourney/CnJourney.vue'
import { createJourneyRunStore } from '../../store/journeyRun.js'

/**
 * CnJourneyDialog — the journey renderer in a modal.
 *
 * Wraps `CnJourney`. Closing the dialog never discards staged answers: they
 * are saved to the run as each step completes, and the dialog keeps its run
 * store, so opening it again (`open` back to true) resumes at the recorded
 * step. Emit `run-started` to keep the run id and resume the same run in a
 * page with `CnJourney :run-id`.
 *
 * Example:
 * ```vue
 * <CnJourneyDialog :journey="journey" :open="open" @close="open = false" />
 * ```
 */
export default {
	name: 'CnJourneyDialog',

	components: { CnJourney, NcDialog },

	props: {
		/**
		 * The journey to render (see `CnJourney`).
		 *
		 * @type {{id: string, title?: string, steps: Array<object>}}
		 */
		journey: {
			type: Object,
			default: () => ({ steps: [] }),
		},

		/** Whether the dialog is shown. Closing keeps the run. */
		open: {
			type: Boolean,
			default: true,
		},

		/** A recorded run to resume (for example one started in a page). */
		runId: {
			type: String,
			default: '',
		},

		/** Run API base. Empty: OpenRegister's journey-run API. */
		endpoint: {
			type: String,
			default: '',
		},

		/** Label of the final Submit button. Empty: "Submit". */
		submitLabel: {
			type: String,
			default: '',
		},
	},

	emits: [
		/** Emitted when the dialog closes. */
		'close',
		/** Emitted when a new journey run starts; payload is the run id. */
		'run-started',
		/** Emitted when the journey moves to another step; payload is { from, to }. */
		'step',
		/** Emitted when the journey is submitted. */
		'submitted',
	],

	data() {
		return {
			runStore: createJourneyRunStore({ endpoint: this.endpoint || undefined, journeyId: this.journey.id }),
		}
	},

	methods: {
		t,

		onClosing() {
			/**
			 * @event close Emitted when the dialog is dismissed. Answers already saved stay on the run.
			 */
			this.$emit('close')
		},

		onSubmitted(result) {
			/**
			 * @event submitted Emitted when the run was submitted. Payload: the server's result.
			 * @type {object}
			 */
			this.$emit('submitted', result)
		},
	},
}
</script>
