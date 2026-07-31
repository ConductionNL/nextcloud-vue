<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — the "is the gate still ARMED?" control.

	The object-form `parserOptions.parser` exists to stop `vue/valid-v-for` from
	reporting hundreds of false positives on correct templates. There are two
	ways to make those false positives go away, and only one of them is a fix:

	  - repair the parser wiring (what the preset does), or
	  - switch `vue/valid-v-for` off (what silences the gate).

	Both leave ModernComponent.vue clean, so ModernComponent alone cannot tell
	them apart. This file can: the `:key` below is bound to a CONSTANT that the
	`v-for` never declares, which is a genuine defect, and
	`tests/eslint/preset.spec.js` asserts it is still reported. If someone ever
	"fixes" a noisy run by disabling the rule, this assertion fails.
-->
<template>
	<div>
		<!-- `:key` must come from the v-for scope; `fixedKey` is an outer
		     constant, so every rendered row shares one key. -->
		<ChildComponent v-for="segment in segments"
			:key="fixedKey"
			:label="segment.label" />
	</div>
</template>

<script>
export default {
	name: 'StillArmed',

	props: {
		segments: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return { fixedKey: 'constant' }
	},
}
</script>
