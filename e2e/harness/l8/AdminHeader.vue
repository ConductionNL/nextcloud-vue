<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An admin settings page as Nextcloud mounts one, with no CnAppRoot around it
  (?l8=admin-header): the shell told `look: "board"` itself, a path under the
  title, a wide section and two cards, as board LpBeheerAlgemeen draws them.
-->
<template>
	<div style="width: 1300px" data-testid="admin-header">
		<CnAdminSettingsShell
			appId="launchpad"
			appName="Launchpad"
			look="board"
			title="Launchpad-beheer: algemeen"
			docUrl="https://launchpad.conduction.nl/docs"
			:showVersionCard="false"
			:breadcrumbs="crumbs"
			breadcrumbNote="geldt voor de hele organisatie">
			<CnSettingsSection name="Setup opnieuw uitvoeren" wide>
				<p>Opslag, groepen, voorbeelddashboards en rollen in vijf stappen.</p>
			</CnSettingsSection>
			<CnSettingsSection name="Standaardinstellingen">
				<p>Gelden voor iedereen.</p>
			</CnSettingsSection>
			<CnSettingsSection name="Toegestane websites">
				<p>Widgets mogen alleen pagina's insluiten van deze sites.</p>
			</CnSettingsSection>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnSettingsSection from '../../../src/components/CnSettingsSection/CnSettingsSection.vue'

import '../../../src/css/index.css'

export default {
	name: 'AdminHeader',

	components: { CnAdminSettingsShell, CnSettingsSection },

	data() {
		return {
			crumbs: [{ label: 'Beheerinstellingen', href: '#admin' }, { label: 'Launchpad' }, { label: 'Algemeen' }],
		}
	},
}
</script>
