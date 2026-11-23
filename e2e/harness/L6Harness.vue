<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  One harness page for the library gaps the app lanes named while building boards as config
  (?l6=<name>). Each scenario is a file in e2e/harness/l6/<Name>.vue, found by
  `import.meta.glob`, so a new scenario needs no edit to App.vue or to this
  file. The name is the file name in kebab-case: `?l6=relative-dates`
  loads l6/RelativeDates.vue.
-->
<template>
	<div class="l6-harness" data-testid="l6-harness">
		<component :is="scenario" v-if="scenario" />
		<p v-else data-testid="l6-unknown">
			No scenario "{{ name }}".
		</p>
	</div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'

const loaders = import.meta.glob('./l6/*.vue')

/**
 * @param {string} name A scenario name in kebab-case.
 * @return {string} The matching glob key.
 */
function keyFor(name) {
	const pascal = name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
	return `./l6/${pascal}.vue`
}

export default {
	name: 'L6Harness',

	data() {
		const name = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('l6') || '') : ''
		const loader = loaders[keyFor(name)]
		return {
			name,
			scenario: loader ? markRaw(defineAsyncComponent(loader)) : null,
		}
	},
}
</script>
