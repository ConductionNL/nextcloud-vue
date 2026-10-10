<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The navigation of the board AppZijbalk (screens/boards/AppZijbalk.html),
  measured in a real browser (?screensnav=1): the real CnAppNav with the
  board's entries (a primary action, three entries of which two carry
  attention counts, two captioned groups, Help and Advanced in the footer)
  inside NcContent, in the board look. `&plain=1` mounts it without the look.
  main.js gives this harness a router so the Dashboard entry is the active
  route, as it is on the board.
-->
<template>
	<div :class="plain ? 'screens-nav' : 'screens-nav cn-look-board'" data-testid="screensnav-box">
		<NcContent appName="harness">
			<CnAppNav :manifest="manifest" :translate="(key) => key" />
			<NcAppContent>
				<p>Content</p>
			</NcAppContent>
		</NcContent>
	</div>
</template>

<script>
import { NcAppContent, NcContent } from '@nextcloud/vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'ScreensNavHarness',

	components: { CnAppNav, NcAppContent, NcContent },

	provide() {
		return { cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board' }
	},

	data() {
		return {
			plain: params.get('plain') === '1',
			manifest: {
				version: '1.0.0',
				pages: [],
				nav: {
					primaryAction: { label: 'Nieuw contact', icon: 'Plus', route: 'Contacts' },
					help: { label: 'Hulp en uitleg', route: 'Help' },
					settingsLabel: 'Geavanceerd',
					includePersonalSettings: true,
				},

				menu: [
					{ id: 'dashboard', label: 'Dashboard', route: 'Dashboard', icon: 'HomeOutline', order: 1 },
					{ id: 'mine', label: 'Mijn werk', route: 'Mine', icon: 'InboxOutline', count: 5, counterVariant: 'attention', order: 2 },
					{ id: 'queue', label: 'Wachtrij', route: 'Queue', icon: 'TrayFull', count: 3, counterVariant: 'attention', order: 3 },
					{ id: 'cap-contact', type: 'caption', label: 'Klantcontact', order: 4 },
					{ id: 'requests', label: 'Vragen en meldingen', route: 'Requests', icon: 'MessageOutline', order: 5 },
					{ id: 'contacts', label: 'Contactmomenten', route: 'Contacts', icon: 'Phone', order: 6 },
					{ id: 'appointments', label: 'Afspraken', route: 'Appointments', icon: 'CalendarOutline', order: 7 },
					{ id: 'cap-relations', type: 'caption', label: 'Relaties', order: 8 },
					{ id: 'people', label: 'Inwoners en bedrijven', route: 'People', icon: 'AccountGroupOutline', order: 9 },
					{ id: 'orgs', label: 'Organisaties', route: 'Organisations', icon: 'OfficeBuildingOutline', order: 10 },
				],
			},
		}
	},
}
</script>
