<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The user settings dialog in the board look (?l8=user-settings-dialog-board),
  as board DqPersoonlijkeInstellingen draws it: navigation entries, a section
  with a labelled select holding a value, and the notification matrix. The
  page carries a stand-in for a theme's link rule (thematiq paints every `a`
  in the link colour, `!important`, unless `--nldesign-color-on-surface`
  says otherwise), so the navigation's ink is measured against it.
-->
<template>
	<div class="cn-look-board" data-testid="user-settings-dialog-board">
		<CnUserSettingsDialog :open="true" title="Persoonlijke instellingen" appName="Dossiq">
			<NcAppSettingsSection id="views" name="Weergaven in mijn menu">
				<p>Deze opgeslagen weergaven staan onderaan je menu.</p>
			</NcAppSettingsSection>
			<NcAppSettingsSection id="notices" name="Meldingen">
				<p>Kies per soort melding waar je hem krijgt.</p>
				<div data-testid="notices-scope">
					<NcSelect
						v-model="domain"
						:options="domains"
						inputLabel="Meldingsdomein"
						:clearable="false" />
				</div>
				<CnNotificationMatrix
					:events="events"
					:channels="channels"
					:personalValues="{}" />
			</NcAppSettingsSection>
		</CnUserSettingsDialog>
	</div>
</template>

<script>
import { NcAppSettingsSection, NcSelect } from '@nextcloud/vue'
import CnNotificationMatrix from '../../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue'
import CnUserSettingsDialog from '../../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue'

import '../../../src/css/index.css'

const style = document.createElement('style')
style.textContent = 'a:not(#header a) { color: var(--nldesign-color-on-surface, rgb(0, 0, 238)) !important; }'
document.head.appendChild(style)

export default {
	name: 'UserSettingsDialogBoard',

	components: { CnNotificationMatrix, CnUserSettingsDialog, NcAppSettingsSection, NcSelect },

	provide: { cnLook: 'board' },

	data() {
		const domains = [{ id: '', label: 'Al mijn werk' }, { id: 'zaken', label: 'Zaken' }]
		return {
			domains,
			domain: domains[0],
			events: [{ id: 'caseAssigned', label: 'Een zaak is aan mij toegewezen', group: 'Zaken' }],
			channels: [{ id: 'nextcloud', label: 'In Nextcloud' }, { id: 'email', label: 'Per e-mail' }],
		}
	},
}
</script>
