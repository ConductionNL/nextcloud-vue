<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div ref="root"
		class="cn-form-error-summary"
		role="alert"
		tabindex="-1"
		data-testid="cn-form-error-summary">
		<h2 class="cn-form-error-summary__title" data-testid="cn-form-error-summary-title">
			{{ heading }}
		</h2>
		<p class="cn-form-error-summary__intro">
			{{ intro }}
		</p>
		<ul class="cn-form-error-summary__list">
			<li v-for="item in errors" :key="item.key">
				<a :href="'#' + item.controlId"
					class="cn-form-error-summary__link"
					:data-error-key="item.key"
					@click.prevent="$emit('focus-field', item.key)">{{ item.message }}</a>
			</li>
		</ul>
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'

/**
 * CnFormErrorSummary - the list of every error of a failed submit, at the top
 * of a board look form (screens-form-parity). It is an alert, takes focus when
 * the form shows it, and each entry is a link that moves focus to its control.
 *
 * @spec openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-a-failed-submit-shows-an-error-summary
 * @event focus-field Emitted with the field key when a link is followed.
 */
export default {
	name: 'CnFormErrorSummary',

	props: {
		/** The errors: `{ key, message, controlId }`, in form order. */
		errors: { type: Array, required: true },
		/** Sentence under the heading. */
		introLabel: { type: String, default: () => t('nextcloud-vue', 'Correct these fields and send the form again.') },
	},

	emits: ['focus-field'],

	computed: {
		heading() {
			return this.errors.length === 1
				? t('nextcloud-vue', 'There is 1 error')
				: n('nextcloud-vue', 'There is %n error', 'There are %n errors', this.errors.length)
		},

		intro() {
			return this.introLabel
		},
	},

	methods: {
		/** Move focus to the summary (called after a failed submit or Next). */
		focus() {
			if (this.$refs.root && typeof this.$refs.root.focus === 'function') {
				this.$refs.root.focus()
			}
		},
	},
}
</script>
