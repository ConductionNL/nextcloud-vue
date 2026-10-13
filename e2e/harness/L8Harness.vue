<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  One harness page for the decidiq library gaps that screens lane L8 builds
  (?l8=<name>). Each scenario is a file in e2e/harness/l8/<Name>.vue, found by
  `import.meta.glob`, so a new scenario needs no edit to App.vue or to this
  file. The name is the file name in kebab-case: `?l8=operator-counts`
  loads l8/OperatorCounts.vue.

  Pick a name that holds none of the bare substrings App.vue tests earlier in
  its v-else-if chain (`fl`, `fd`, `sd`, `wt`, `arr`, `spa`, `ifw`, `dash`,
  `chip`, `canvas`, ...): `?l8=flat-...` would open the field-list harness.
-->
<template>
	<div class="l8-harness" data-testid="l8-harness">
		<component :is="scenario" v-if="scenario" />
		<p v-else data-testid="l8-unknown">
			No scenario "{{ name }}".
		</p>
	</div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'

const loaders = import.meta.glob('./l8/*.vue')

/**
 * @param {string} name A scenario name in kebab-case.
 * @return {string} The matching glob key.
 */
function keyFor(name) {
	const pascal = name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
	return `./l8/${pascal}.vue`
}

export default {
	name: 'L8Harness',

	data() {
		const name = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('l8') || '') : ''
		const loader = loaders[keyFor(name)]
		return {
			name,
			scenario: loader ? markRaw(defineAsyncComponent(loader)) : null,
		}
	},
}
</script>
