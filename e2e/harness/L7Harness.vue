<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  One harness page for the pieces of library lane L7
  (?l7=<name>). Each scenario is a file in e2e/harness/l7/<Name>.vue, found by
  `import.meta.glob`, so a new scenario needs no edit to App.vue or to this
  file. The name is the file name in kebab-case: `?l7=nested-settings`
  loads l7/NestedSettings.vue.
-->
<template>
	<div class="l7-harness" data-testid="l7-harness">
		<component :is="scenario" v-if="scenario" />
		<p v-else data-testid="l7-unknown">
			No scenario "{{ name }}".
		</p>
	</div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'

const loaders = import.meta.glob('./l7/*.vue')

/**
 * @param {string} name A scenario name in kebab-case.
 * @return {string} The matching glob key.
 */
function keyFor(name) {
	const pascal = name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
	return `./l7/${pascal}.vue`
}

export default {
	name: 'L7Harness',

	data() {
		const name = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('l7') || '') : ''
		const loader = loaders[keyFor(name)]
		return {
			name,
			scenario: loader ? markRaw(defineAsyncComponent(loader)) : null,
		}
	},
}
</script>
