<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The workspace-filter start card in a 1118px dashboard cell (?startcard=1).
  OpenRegister reads are stubbed by the spec with page.route().
-->
<template>
	<div class="start-card-harness" data-testid="start-card-harness">
		<CnWorkspaceFilterWidget :content="content" />
		<p data-testid="start-card-focus">
			{{ workspace.selectedClient || '' }}
		</p>
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

export default {
	name: 'StartCardHarness',

	components: { CnWorkspaceFilterWidget },

	setup() {
		const workspace = ref({})
		provide('cnWorkspaceContext', workspace)
		return { workspace }
	},

	data() {
		return {
			content: {
				layout: 'start',
				title: 'Contact starten',
				description: 'Zoek de klant aan de lijn of aan de balie. Verzoeken, taken en eerder contact openen hieronder.',
				writes: '@workspace.selectedClient',
				objectSource: { register: 'pipelinq', schema: 'client', labelField: 'name', placeholder: 'Naam, telefoon, e-mail, postcode of klantnummer' },
				link: { label: 'Bekijk een voorbeeld', href: '#voorbeeld' },
			},
		}
	},
}
</script>

<style scoped>
.start-card-harness {
	width: 1118px;
	box-sizing: border-box;
	padding: 20px 22px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
}
</style>
