<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — the ARMED half of the `<template v-for>` key pair.

	`vue/no-v-for-template-key` and `vue/no-v-for-template-key-on-child` are two
	halves of one migration, pointing in opposite directions. The preset
	switches OFF the Vue-2 half; this fixture proves it did not take the Vue-3
	half down with it.

	The `:key` below sits on the CHILD of a `<template v-for>` — the Vue 2
	placement, and a genuine defect under Vue 3.
-->
<template>
	<dl>
		<template v-for="row in rows">
			<dt :key="row.id">
				{{ row.term }}
			</dt>
		</template>
	</dl>
</template>

<script>
export default {
	name: 'Vue2KeyPlacement',

	props: {
		rows: {
			type: Array,
			default: () => [],
		},
	},
}
</script>
