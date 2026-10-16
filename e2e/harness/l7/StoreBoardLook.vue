<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The store page under the board look (?l7=store-board-look), with the chips,
  cards, side column and footnote of board PqStore. The spec stubs the app's
  store endpoint with the board's nine items.
-->
<template>
	<div class="cn-look-board" style="width: 1184px; background: var(--color-background-hover)" data-testid="store-board-look">
		<CnStorePage
			app="pipelinq"
			title="Store"
			description="Een pagina die elke app heeft · sjablonen en connectors voor Pipelinq, 9 in de registry"
			:can-install="true"
			:can-publish="true"
			publish-route="Publish"
			:kind-chips="[{ value: 'adapter', label: 'Connectors' }]"
			updates-note="Een update bewaart je eigen wijzigingen aan fases en wachtrijen."
			:built-in="builtIn"
			footnote="This page comes from the library (nextcloud-vue) and looks the same in every app; only the content is the app's own." />
	</div>
</template>

<script>
import CnStorePage from '../../../src/components/CnStorePage/CnStorePage.vue'

import '../../../src/css/index.css'

export default {
	name: 'StoreBoardLook',

	components: { CnStorePage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			builtIn: [
				{ slug: 'b2b-sales-pipeline', title: 'B2B-verkooppipeline' },
				{ slug: 'service-desk-routing', title: 'Routering voor de servicedesk' },
				{ slug: 'retail-pos-setup', title: 'Kassa-inrichting voor de winkel' },
			],
		}
	},
}
</script>
