<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnNextStepCard
		v-if="step"
		:title="filled(step.title)"
		:items="step.items"
		:after="filled(step.after)" />
</template>

<script>
import CnNextStepCard from './CnNextStepCard.vue'
import { resolveNextStep } from '../../utils/detailActionModel.js'
import { firstFilled } from '../../utils/fillTemplate.js'

/**
 * CnNextStepWidget: the `next-step` detail widget type.
 *
 * Renders CnNextStepCard for the bound record's stage from
 * `content: { field?, stages: { <stage>: { title?, checklist, after? } } }`.
 * The checklist only: the page's own primary button stays where the page
 * puts it. Resolved by its registry key, and exported for an app that renders it itself.
 */
export default {
	name: 'CnNextStepWidget',

	components: {
		CnNextStepCard,
	},

	props: {
		/** The widget's content: `{ field?, title?, stages }`. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/**
		 * The card for the record's stage.
		 *
		 * @return {object|null} The resolved card, or null when the stage declares none.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card
		 */
		step() {
			return resolveNextStep(this.content, this.objectData)
		},
	},

	methods: {
		/**
		 * A title or `after` line with its record fields filled, the first
		 * candidate that fills.
		 *
		 * @param {string|string[]} text The text or its candidates.
		 * @return {string} The text.
		 * @spec openspec/changes/next-step-title-tokens/specs/next-step-title-tokens/spec.md#requirement-a-what-now-title-can-name-record-fields
		 */
		filled(text) {
			return firstFilled(text, this.objectData)
		},
	},
}
</script>
