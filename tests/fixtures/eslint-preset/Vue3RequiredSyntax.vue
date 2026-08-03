<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — the two INVERTED Vue-2 rules.

	Everything in this template is not merely allowed in Vue 3, it is the
	REQUIRED spelling. Two `eslint-plugin-vue` rules forbid exactly these
	constructs because they encode the Vue 2 rules, which are the reverse:

	  - `vue/no-v-for-template-key` — Vue 2 wanted the `:key` on the CHILD of a
	    `<template v-for>`. Vue 3 wants it ON the `<template v-for>`, and has a
	    separate rule (`vue/no-v-for-template-key-on-child`) that reports the
	    Vue-2 placement. Only the inverted one is switched off by the preset.
	  - `vue/no-v-model-argument` — `v-model:arg` is Vue 3's replacement for the
	    removed `.sync` modifier, which `vue/no-deprecated-v-bind-sync` (armed
	    at `error` in this same preset) forces you to migrate TO.

	Every migrated app had to disable both by hand; the Nextcloud app template
	carried them under a `TODO(nc-vue)`. `tests/eslint/preset.spec.js` lints this
	file through a base config that ARMS both rules (eslint-plugin-vue's own
	`flat/vue2-essential`) — first without the preset, to prove the fixture
	really does trigger them, then with it, where it must be clean.
-->
<template>
	<div>
		<!-- Vue 3: the key goes ON the <template v-for>. -->
		<dl>
			<template v-for="row in rows" :key="row.id">
				<dt>{{ row.term }}</dt>
				<dd>{{ row.definition }}</dd>
			</template>
		</dl>

		<!-- Vue 3: `v-model:arg`, the replacement for `:arg.sync`. -->
		<ChildComponent v-model:title="title"
			v-model:open="open"
			v-model="body" />
	</div>
</template>

<script>
export default {
	name: 'Vue3RequiredSyntax',

	props: {
		rows: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return {
			title: '',
			open: false,
			body: '',
		}
	},
}
</script>
