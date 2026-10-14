<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Radio cards as a compact list (?l8=radio-cards-list), as board DcBeheer draws
  "Soort organisatie", beside the same options as cards.
-->
<template>
	<div style="width: 520px; display: flex; flex-direction: column; gap: 40px">
		<div data-testid="radio-list">
			<CnRadioCardsWidget :content="{ ...content, variant: 'list' }" :objectData="object" />
		</div>
		<div data-testid="radio-cards">
			<CnRadioCardsWidget :content="content" :objectData="object" />
		</div>
	</div>
</template>

<script>
import CnRadioCardsWidget from '../../../src/components/CnRadioCardsWidget/CnRadioCardsWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'RadioCardsList',

	components: { CnRadioCardsWidget },

	data() {
		return {
			object: { id: 'settings', mode: 'gov' },
			content: {
				field: 'mode',
				label: 'Soort organisatie',
				columns: 1,
				save: { url: '/apps/decidiq/api/settings', method: 'POST' },
				options: [
					{ value: 'gov', label: 'Gemeente', description: 'Raad, college, commissies, griffie' },
					{ value: 'assoc', label: 'Vereniging of VvE', description: 'Bestuur, leden, algemene ledenvergadering' },
					{ value: 'corp', label: 'Onderneming', description: 'Raad van bestuur, raad van commissarissen' },
					{ value: 'ops', label: 'Team', description: 'Overleg, besluiten, actiepunten' },
				],
			},
		}
	},
}
</script>
