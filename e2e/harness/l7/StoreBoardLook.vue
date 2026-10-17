<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The store page under the board look (?l7=store-board-look), with the chips,
  cards, side column and footnote of board PqStore. The harness answers the
  app's store endpoint itself with the board's nine items, so the page also
  renders without a test runner in front of it.
-->
<template>
	<div class="cn-look-board" style="width: 1184px; background: var(--color-background-hover)" data-testid="store-board-look">
		<CnStorePage
			app="pipelinq"
			title="Store"
			description="Een pagina die elke app heeft · sjablonen en connectors voor Pipelinq, 9 in de registry"
			:canInstall="true"
			:canPublish="true"
			publishRoute="Publish"
			:kindChips="[{ value: 'adapter', label: 'Connectors' }]"
			updatesNote="Een update bewaart je eigen wijzigingen aan fases en wachtrijen."
			:builtIn="builtIn"
			footnote="This page comes from the library (nextcloud-vue) and looks the same in every app; only the content is the app's own." />
	</div>
</template>

<script>
import CnStorePage from '../../../src/components/CnStorePage/CnStorePage.vue'

import '../../../src/css/index.css'

const card = (slug, title, typeName, publisher, description, extra = {}) => ({ slug, title, typeName, publisher, description, version: '1.0.0', ...extra })

const CARDS = [
	card('b2b', 'B2B-verkooppipeline', 'Pipelinesjabloon', 'Conduction', 'Van kwalificatie tot afsluiten, met de fases die een langere deal doorloopt.', { kind: 'pipeline', version: '1.3.0', installed: true, openUrl: '#b2b' }),
	card('routing', 'Routering voor de servicedesk', 'Routering via wachtrijen', 'Conduction', 'Wachtrijen en vaardigheden die een binnenkomend verzoek bij iemand leggen die het kan beantwoorden.', { kind: 'queue-routing', version: '2.0.1', latestVersion: '2.1.0', installed: true, updateAvailable: true }),
	card('pos', 'Kassa-inrichting voor de winkel', 'Kassa-inrichting', 'Conduction', 'Betaalwijzen, retourredenen, kassarollen en een bonsjabloon.', { kind: 'pos-setup', version: '1.1.0' }),
	card('woo', 'Pipeline voor Woo-vragen', 'Pipelinesjabloon', 'Gemeente Lindewaard', 'Fases voor een Woo-vraag, van intake tot overdracht aan dossiq.', { kind: 'pipeline', version: '1.2.0' }),
	card('balie', 'Baliproducten en leges', 'Catalogus', 'Gemeente Lindewaard', 'Producten en diensten die aan de balie worden verkocht, met prijzen en btw-tarieven.', { kind: 'catalogue', version: '0.9.2' }),
	card('pas', 'Bewonerspas', 'Loyaliteitsprogramma', 'Gemeente Oosterwold', 'Punten voor bezoek aan bibliotheek, zwembad en sportpark, in drie niveaus.', { kind: 'loyalty-programme', installed: true, openUrl: '#pas' }),
	card('brevo', 'Bulkmail via Brevo', 'Connector', 'Conduction', 'Verstuurt mailings via Brevo, over een bron in integriq.', { kind: 'adapter', version: '1.4.0', installed: true, openUrl: '#brevo' }),
	card('asterisk', 'Asterisk-telefonie', 'Connector', 'Conduction', 'Schermmeldingen en klikken om te bellen via een Asterisk-centrale.', { kind: 'adapter', version: '2.6.1', latestVersion: '3.0.0', installed: true, updateAvailable: true }),
	card('berichtenbox', 'Berichtenbox', 'Connector', 'Conduction', 'Berichten naar de Berichtenbox van MijnOverheid van een inwoner, via Logius.', { kind: 'adapter' }),
]

const realFetch = window.fetch.bind(window)
window.fetch = (url, options) => (String(url).includes('/apps/pipelinq/api/store/items')
	? Promise.resolve(new Response(JSON.stringify({ outcome: 'ok', cards: CARDS }), { headers: { 'Content-Type': 'application/json' } }))
	: realFetch(url, options))

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
