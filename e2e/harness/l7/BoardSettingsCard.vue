<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Admin settings sections as cards under the board look (?l7=board-settings-card):
  CnAdminSettingsShell told `look: "board"` holding Nextcloud's own
  NcSettingsSection with a name, a description and a note card, as portaliq's
  admin page draws "Aanmelden op het portaal" (board PtBeheerinstellingen).
  1176px is the content width beside the 264px settings navigation at 1440.
-->
<template>
	<div style="width: 1176px" data-testid="board-settings-card">
		<CnAdminSettingsShell
			appId="portaliq"
			appName="Portaliq"
			look="board"
			title="Portaliq"
			:showVersionCard="false">
			<NcSettingsSection
				name="Aanmelden op het portaal"
				description="Het portaal ondertekent de sessies van inwoners en bedrijven met een eigen sleutel van deze app, nooit met de sleutel van de Nextcloud-server.">
				<NcNoteCard type="success">
					Er is een eigen ondertekeningssleutel ingesteld. Inloggen op het portaal is veilig te gebruiken.
				</NcNoteCard>
			</NcSettingsSection>
			<NcSettingsSection
				name="Organisatie"
				description="Trek in één keer alle portaalsessies van één organisatie in. Wie daarna verder wil, logt opnieuw in.">
				<p>Organisatie-UUID</p>
			</NcSettingsSection>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import { NcNoteCard, NcSettingsSection } from '@nextcloud/vue'
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardSettingsCard',

	components: { CnAdminSettingsShell, NcNoteCard, NcSettingsSection },
}
</script>
