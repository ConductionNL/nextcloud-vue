<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The admin settings shell with a tab strip (?l8=admin-tabs, admin-settings-tabs,
  board ShInstellingen): three tabs, two of them with a count, the version card
  on the first, and settings sections as cards in each panel.
-->
<template>
	<div style="width: 1100px" data-testid="admin-tabs">
		<CnAdminSettingsShell
			appId="shillinq"
			appName="Shillinq"
			look="board"
			title="Shillinq"
			:tabs="tabs"
			:showReimport="false"
			:showSupport="false"
			appVersion="1.4.0">
			<NcSettingsSection name="Boekjaar" description="Het boekjaar begint op 1 januari." />
			<template #tab-velden>
				<NcSettingsSection name="Verplichte velden" description="Kies welke velden ingevuld moeten zijn." />
				<NcSettingsSection name="Voorbeeld" description="Een tweede kaart in dit tabblad." />
			</template>
			<template #tab-koppelingen>
				<NcSettingsSection name="Koppelingen" description="Zie welke koppelingen werken." />
			</template>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import { NcSettingsSection } from '@nextcloud/vue'
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'

import '../../../src/css/index.css'

export default {
	name: 'AdminTabs',

	components: { CnAdminSettingsShell, NcSettingsSection },

	data() {
		return {
			tabs: [
				{ id: 'algemeen', label: 'Algemeen' },
				{ id: 'velden', label: 'Verplichte velden', count: 12 },
				{ id: 'koppelingen', label: 'Koppelingen', count: 5 },
			],
		}
	},
}
</script>
