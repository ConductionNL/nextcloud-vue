<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The reports page under the board look (?l7=reports-board-look), with the
  categories, cards, side column and footnote of board PqReports.
-->
<template>
	<div class="cn-look-board" style="width: 1184px; background: var(--color-background-hover)" data-testid="reports-board-look">
		<CnReportsPage :page="page" />
	</div>
</template>

<script>
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import Bullhorn from 'vue-material-design-icons/Bullhorn.vue'
import CalendarWeek from 'vue-material-design-icons/CalendarWeek.vue'
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import ChartPie from 'vue-material-design-icons/ChartPie.vue'
import Phone from 'vue-material-design-icons/Phone.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Star from 'vue-material-design-icons/Star.vue'
import TrendingUp from 'vue-material-design-icons/TrendingUp.vue'
import { registerIcons } from '../../../src/components/CnIcon/CnIcon.vue'
import CnReportsPage from '../../../src/components/CnReportsPage/CnReportsPage.vue'

import '../../../src/css/index.css'

registerIcons({ AccountGroupOutline, Bullhorn, CalendarWeek, ChartBar, ChartPie, Phone, Plus, Star, TrendingUp })

export default {
	name: 'ReportsBoardLook',

	components: { CnReportsPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			page: {
				id: 'Reports',
				title: 'Rapportages',
				config: {
					description: 'Een pagina die elke app heeft · elke rapportage van Pipelinq, 8 rapportages in 5 categorieën',
					headerButtons: [{ label: 'Nieuw analyserapport', action: 'new', variant: 'primary', icon: 'Plus' }],
					headerActions: [{ id: 'new', label: 'Nieuw analyserapport', handler: 'emit' }],
					categories: { volume: 'Aantallen en kanalen', people: 'Mensen en prestaties', revenue: 'Omzet en prognose', loyalty: 'Klantloyaliteit', marketing: 'Marketing en campagnes' },
					cards: [
						{ id: 'report', label: 'Rapportage', description: 'Totale aantallen en trends over de hele dienstverlening.', category: 'volume', icon: 'ChartBar', route: 'Report' },
						{ id: 'contacts', label: 'Contactrapportage', description: 'Hoeveel contacten binnenkwamen, en waarover.', category: 'volume', icon: 'Phone', route: 'Contacts' },
						{ id: 'channels', label: 'Kanaalanalyse', description: 'Via welke kanalen mensen je bereiken, en hoe dat verschuift.', category: 'volume', icon: 'ChartPie', route: 'Channels' },
						{ id: 'agents', label: 'Prestaties medewerkers', description: 'Afhandeltijden en werkdruk per medewerker.', category: 'people', icon: 'AccountGroupOutline', route: 'Agents' },
						{ id: 'forecast', label: 'Prognose', description: 'Wat het kwartaal naar verwachting oplevert, per eigenaar.', category: 'revenue', icon: 'TrendingUp', route: 'Forecast' },
						{ id: 'loyalty', label: 'Loyaliteitsrapportage', description: 'Punten, niveaus en inwisselingen per loyaliteitsprogramma.', category: 'loyalty', icon: 'Star', route: 'Loyalty' },
						{ id: 'campaign', label: 'Campagnerapport', description: 'Wat een campagne bereikte, wat ze opleverde en wat ze kostte.', category: 'marketing', icon: 'Bullhorn', route: 'Campaign' },
						{ id: 'weekly', label: 'Weekoverzicht', description: 'Wat vorige week bewoog, wat je kunt proberen, en drie ideeën voor onderwerpen.', category: 'marketing', icon: 'CalendarWeek', route: 'Weekly' },
					],

					sideNote: { title: 'Mis je een rapportage?', text: 'Bouw er zelf een in Nextcloud Analytics met Nieuw analyserapport, of vraag een beheerder een rapportage aan de app toe te voegen.' },
					footnote: 'This page comes from the library (nextcloud-vue) and looks the same in every app; only the content is the app\'s own.',
				},
			},
		}
	},
}
</script>
