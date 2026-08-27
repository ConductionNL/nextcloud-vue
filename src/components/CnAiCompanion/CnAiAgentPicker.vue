<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: AGPL-3.0-or-later

  CnAiAgentPicker — agent dropdown shown on the AI Chat Companion's
  "start a new conversation" screen (CnAiChatPanel's empty-state).

  Purely presentational: the `agents` array (raw objects from
  `GET {chatApiBase}/agents`), `loading` and `fetchError` are owned and
  fetched by the parent (CnAiChatPanel) so the same fetch also feeds the
  default-agent selection logic. This component only renders the picker and
  emits the chosen agent uuid.

  Degrades gracefully: zero agents disables the select with an explanatory
  placeholder; a fetch error renders a short inline notice instead of the
  select (never blanks the panel — the message input and recent sessions
  above/below it stay usable either way).
-->
<template>
	<div class="cn-ai-agent-picker" data-testid="cn-ai-agent-picker">
		<!-- `input-label` WITHOUT `aria-label-combobox`. NcSelect warns when both
		     are set, because they are alternatives: `input-label` renders a real
		     visible <label> wired to the input, which already gives the combobox
		     its accessible name, while `aria-label-combobox` is for the
		     label-less case. Setting both asks for a visible label and then
		     overrides the name that label provides. -->
		<NcSelect
			v-if="!fetchError"
			:model-value="selectedOption"
			:options="options"
			:loading="loading"
			:disabled="loading || options.length === 0"
			:clearable="false"
			:close-on-select="true"
			label="label"
			:input-label="cnTranslate('Agent')"
			:placeholder="pickerPlaceholder"
			data-testid="cn-ai-agent-picker-select"
			@update:model-value="onInput" />
		<p v-else class="cn-ai-agent-picker__error" data-testid="cn-ai-agent-picker-error">
			{{ cnTranslate('Could not load agents — you can still send a message.') }}
		</p>
	</div>
</template>

<script>
import { NcSelect } from '@nextcloud/vue'

export default {
	name: 'CnAiAgentPicker',

	components: {
		NcSelect,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Raw agent objects from `GET {chatApiBase}/agents` (`{ uuid|id, name|title }`). */
		agents: {
			type: Array,
			default: () => [],
		},
		/** Selected agent uuid (v-model style — parent owns the value). */
		value: {
			type: String,
			default: null,
		},
		/**
		 * The same value as `value`, under Vue 3's own v-model name.
		 *
		 * ⚠️ WITHOUT THIS, `v-model` ON THIS COMPONENT DOES NOTHING. Vue 3
		 * compiles `v-model="x"` to `:modelValue` + `@update:modelValue`, so a
		 * component declaring only `value`/`input` never receives the prop and
		 * its emit is never heard — silently, looking exactly like a component
		 * that works.
		 *
		 * `value` stays the public name; both are accepted. The default is
		 * `undefined` so "not passed" is distinguishable from "passed empty".
		 *
		 * @type {string|object}
		 */
		modelValue: { type: [String, Object], default: undefined },
		/** Whether the agent list is still loading. */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether the agent-list fetch failed. */
		fetchError: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['input', 'update:modelValue',],

	computed: {
		/**
		 * The value the consumer actually bound, whichever prop they used.
		 *
		 * @return {*} The bound value.
		 */
		boundValue() {
			return this.modelValue !== undefined ? this.modelValue : this.value
		},
		options() {
			return this.agents.map((agent) => ({
				id: agent.uuid || agent.id,
				label: agent.name || agent.title || this.cnTranslate('Untitled agent'),
			}))
		},

		selectedOption() {
			return this.options.find((option) => option.id === this.boundValue) || null
		},

		pickerPlaceholder() {
			if (this.loading) {
				return this.cnTranslate('Loading agents…')
			}
			if (this.options.length === 0) {
				return this.cnTranslate('No agents available')
			}
			return this.cnTranslate('Choose an agent')
		},
	},

	methods: {
		/**
		 * Tell the consumer the value changed, in both v-model dialects.
		 *
		 * BOTH are emitted, always: a consumer on `@input` and a consumer on
		 * `v-model` are the same consumer as far as this component knows, and
		 * emitting only one silently breaks half of them.
		 *
		 * @param {*} next The new value.
		 * @return {void}
		 */
		emitValue(next) {
			/**
			 * @event input The value changed. Vue 2's v-model dialect, kept for
			 *   existing consumers.
			 * @type {*}
			 */
			this.$emit('input', next)
			/**
			 * @event update:modelValue The value changed. Vue 3's v-model
			 *   dialect — what a plain `v-model` listens for.
			 * @type {*}
			 */
			this.$emit('update:modelValue', next)
		},
		onInput(option) {
			this.emitValue(option ? option.id : null)
		},
	},
}
</script>

<style>
.cn-ai-agent-picker {
	width: 100%;
}

.cn-ai-agent-picker__error {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>
