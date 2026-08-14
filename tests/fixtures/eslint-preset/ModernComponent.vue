<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — the CLEAN counterpart of LegacyComponent.vue.

	A gate that flags everything is as useless as one that flags nothing, so
	`tests/eslint/preset.spec.js` asserts this file produces ZERO findings.
	It deliberately exercises the two things a mis-wired preset gets wrong:

	  1. `v-for` + `:key` bound from the loop variable. With
	     `parserOptions.parser` written as a bare string, vue-eslint-parser
	     routes template expressions through the TypeScript parser, loses the
	     `v-for` scope, and reports this correct code as `vue/valid-v-for`.
	  2. `?.`, `??` and object spread. With a stale `ecmaVersion`, these are
	     unparseable and manufacture warnings about valid syntax.

	It also binds `@update:modelValue` in its camelCase form, which must NOT be
	reported (or autofixed) — see `vueEventCasingRules` in eslint/index.js.
-->
<template>
	<div>
		<ChildComponent v-for="segment in segments"
			:key="segment.mode"
			:model-value="segment.label"
			@update:modelValue="onUpdate" />
	</div>
</template>

<script>
export default {
	name: 'ModernComponent',

	props: {
		segments: {
			type: Array,
			default: () => [],
		},
		overrides: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['picked'],

	data() {
		return { timer: null }
	},

	computed: {
		/**
		 * Optional chaining, nullish coalescing and object spread in one
		 * expression — the exact syntax an `ecmaVersion: 6` config cannot parse.
		 *
		 * @return {object} The resolved options bag.
		 */
		resolved() {
			const first = this.segments?.[0] ?? null
			return { mode: first?.mode ?? 'default', ...this.overrides }
		},
	},

	mounted() {
		this.timer = setInterval(() => {}, 1000)
	},

	beforeUnmount() {
		clearInterval(this.timer)
	},

	methods: {
		/**
		 * Forward a child's model update.
		 *
		 * @param {string} value The new value.
		 * @return {void}
		 */
		onUpdate(value) {
			this.$emit('picked', value)
		},
	},
}
</script>
