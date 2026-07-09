<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcSelect
		v-if="options.length"
		:value="value"
		:options="options"
		:input-label="label"
		:clearable="clearable"
		@input="$emit('update', $event || '')" />
	<NcTextField
		v-else
		:value="value"
		:label="label"
		:placeholder="placeholder"
		@update:value="$emit('update', $event)" />
</template>

<script>
import { NcSelect, NcTextField } from '@nextcloud/vue'

/**
 * CnFieldPicker — a schema-field input for the widget config forms. Renders a
 * dropdown of the schema's known properties when `options` are available
 * (resolved via `fetchSchemaProperties`), and falls back to a free-text field
 * when the schema has no sampled fields yet. Emits the chosen field name via
 * `update` (v-model-style on a custom event so it works with either control).
 */
export default {
	name: 'CnFieldPicker',

	components: { NcSelect, NcTextField },

	props: {
		/**
		 * The current field name.
		 *
		 * @type {string}
		 */
		value: {
			type: String,
			default: '',
		},
		/**
		 * The visible label for the control.
		 *
		 * @type {string}
		 */
		label: {
			type: String,
			default: '',
		},
		/**
		 * Available field names (schema properties); empty falls back to text.
		 *
		 * @type {string[]}
		 */
		options: {
			type: Array,
			default: () => [],
		},
		/**
		 * Placeholder for the text fallback.
		 *
		 * @type {string}
		 */
		placeholder: {
			type: String,
			default: '',
		},
		/**
		 * Whether the dropdown may be cleared back to empty.
		 *
		 * @type {boolean}
		 */
		clearable: {
			type: Boolean,
			default: true,
		},
	},

	emits: [
		/**
		 * Emitted with the chosen field name on change.
		 *
		 * @event update
		 * @type {string}
		 */
		'update',
	],
}
</script>
