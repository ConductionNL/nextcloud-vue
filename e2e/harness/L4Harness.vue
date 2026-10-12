<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  One harness page for the dashboard-page pieces of the Mijn werk programme
  (?l4=<name>). Each scenario is a file in e2e/harness/l4/<Name>.vue, found by
  `import.meta.glob`, so a new scenario needs no edit to App.vue or to this
  file. The name is the file name in kebab-case: `?l4=record-list-avatar`
  loads l4/RecordListAvatar.vue.
-->
<template>
	<div class="l4-harness" data-testid="l4-harness">
		<component :is="scenario" v-if="scenario" />
		<p v-else data-testid="l4-unknown">
			No scenario "{{ name }}".
		</p>
	</div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'

const loaders = import.meta.glob('./l4/*.vue')

/**
 * @param {string} name A scenario name in kebab-case.
 * @return {string} The matching glob key.
 */
function keyFor(name) {
	const pascal = name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
	return `./l4/${pascal}.vue`
}

export default {
	name: 'L4Harness',

	data() {
		const name = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('l4') || '') : ''
		const loader = loaders[keyFor(name)]
		return {
			name,
			scenario: loader ? markRaw(defineAsyncComponent(loader)) : null,
		}
	},
}
</script>
