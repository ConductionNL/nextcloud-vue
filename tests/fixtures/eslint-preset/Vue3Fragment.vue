<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — the third INVERTED Vue-2 rule.

	`vue/no-multiple-template-root` encodes Vue 2's single-root-element
	constraint. Vue 3 introduced fragments: a component whose template has
	several root nodes is valid, and it is the correct spelling whenever the
	component contributes SIBLINGS to its parent's layout — a group of table
	rows, a set of toolbar buttons, a `<dt>`/`<dd>` pair. The only way to
	satisfy the rule is to wrap them in an element that then sits between the
	parent's layout container and its intended children, which breaks the
	parent's grid/flex/table semantics and every selector written against it.

	The preset already switched off the other two rules of this class
	(`vue/no-v-model-argument`, `vue/no-v-for-template-key`) and missed this
	one, so consumers were still disabling it by hand.

	`tests/eslint/preset.spec.js` lints this file through a base config that
	ARMS the rule (eslint-plugin-vue's own `flat/vue2-essential`) — first
	without the preset, to prove the fixture really does trigger it, then with
	it, where it must be clean.
-->
<template>
	<tr class="cn-fragment-probe__head">
		<th scope="row">{{ label }}</th>
	</tr>
	<tr class="cn-fragment-probe__body">
		<td>{{ value }}</td>
	</tr>
</template>

<script>
export default {
	name: 'Vue3Fragment',

	props: {
		label: {
			type: String,
			default: '',
		},
		value: {
			type: String,
			default: '',
		},
	},
}
</script>
