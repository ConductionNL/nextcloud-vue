<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. -->
<!--
	PROBE FIXTURE — deliberately broken. Do not "fix" it.

	Every construct below is a Vue 2 idiom that Vue 3 accepts without a warning
	and then ignores. `tests/eslint/preset.spec.js` lints this file through the
	published `@conduction/nextcloud-vue/eslint` preset and asserts that each
	one is reported by name; if a rule silently stops firing, that assertion is
	what fails.

	This is the file that stands in for openconnector's four surviving
	`beforeDestroy` hooks — each one a live `setInterval` / subscription leak
	that produced no console output whatsoever.
-->
<template>
	<div>
		<!-- vue/no-deprecated-v-bind-sync -->
		<ChildComponent :value.sync="localValue" />
		<!-- vue/no-deprecated-filter -->
		<span>{{ label | upperCase }}</span>
		<!-- vue/no-deprecated-v-on-native-modifier -->
		<ChildComponent @click.native="onClick" />
		<!-- vue/no-deprecated-slot-attribute -->
		<ChildComponent>
			<template slot="footer">
				footer
			</template>
		</ChildComponent>
	</div>
</template>

<script>
export default {
	name: 'LegacyComponent',

	// vue/no-restricted-component-options — the `filters:` OPTION. Note that
	// `vue/no-deprecated-filter` above only sees the TEMPLATE usage; without
	// the explicit restriction this block lints clean.
	filters: {
		upperCase(value) {
			return String(value).toUpperCase()
		},
	},

	// vue/no-deprecated-model-definition
	model: {
		prop: 'value',
		event: 'input',
	},

	props: {
		label: {
			type: String,
			default: '',
		},
		// vue/no-deprecated-props-default-this — `this` is undefined inside a
		// Vue 3 prop default factory, so this throws during prop resolution and
		// white-screens the page.
		fallback: {
			type: Object,
			default() {
				return { from: this.label }
			},
		},
	},

	data() {
		return { localValue: '', timer: null }
	},

	mounted() {
		this.timer = setInterval(() => {}, 1000)
		// vue/no-deprecated-events-api
		this.$on('refresh', this.onClick)
	},

	// vue/no-deprecated-destroyed-lifecycle — Vue 3 never calls this, so the
	// 1 Hz interval above runs forever.
	beforeDestroy() {
		clearInterval(this.timer)
	},

	methods: {
		onClick() {
			// vue/no-deprecated-delete-set
			this.$set(this.$data, 'localValue', 'x')
		},
	},
}
</script>
