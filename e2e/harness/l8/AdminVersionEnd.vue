<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An admin settings page whose board starts with the app's own card
  (?l8=admin-version-end): the shell told `versionCardPosition: "end"`, as
  board DcBeheer draws the decidiq admin page.
-->
<template>
	<div style="width: 1300px" data-testid="admin-version-end">
		<CnAdminSettingsShell
			appId="decidiq"
			appName="Decidiq"
			appVersion="1.2.6"
			look="board"
			title="Beheer"
			versionCardPosition="end"
			:showSetup="true"
			:breadcrumbs="crumbs">
			<CnSettingsSection name="Organisatie" data-testid="app-organisation">
				<p>Bepaalt de woorden en standaarden in de hele app.</p>
			</CnSettingsSection>
			<CnSettingsSection name="Processjablonen" wide>
				<p>De stappen, stemregels en het quorum per soort besluit.</p>
			</CnSettingsSection>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnSettingsSection from '../../../src/components/CnSettingsSection/CnSettingsSection.vue'

import '../../../src/css/index.css'

export default {
	name: 'AdminVersionEnd',

	components: { CnAdminSettingsShell, CnSettingsSection },

	data() {
		return {
			crumbs: [{ label: 'Beheerinstellingen', href: '#admin' }, { label: 'Decidiq' }, { label: 'Beheer' }],
		}
	},
}
</script>
