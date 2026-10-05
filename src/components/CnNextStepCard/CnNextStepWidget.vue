<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnNextStepCard
		v-if="step"
		:title="step.title"
		:items="step.items"
		:after="step.after" />
</template>

<script>
import CnNextStepCard from './CnNextStepCard.vue'
import { resolveNextStep } from '../../utils/detailActionModel.js'

/**
 * CnNextStepWidget: the `next-step` detail widget type.
 *
 * Renders CnNextStepCard for the bound record's stage from
 * `content: { field?, stages: { <stage>: { title?, checklist, after? } } }`.
 * The checklist only: the page's own primary button stays where the page
 * puts it. Resolved by its registry key, not exported.
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
}
</script>
