<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An app settings component that wraps its sections in one element
  (?l8=admin-nested-sections), as decidiq's Settings.vue does, inside a shell
  told `look: "board"`.
-->
<template>
	<div style="width: 1300px" data-testid="admin-nested-sections">
		<CnAdminSettingsShell
			appId="decidiq"
			appName="Decidiq"
			look="board"
			title="Beheer"
			:showVersionCard="false">
			<div class="app-settings-wrapper" data-testid="app-wrapper">
				<CnSettingsSection name="Organisatie" data-testid="nested-organisation">
					<p>Bepaalt de woorden en standaarden in de hele app.</p>
				</CnSettingsSection>
				<CnSettingsSection name="Register" data-testid="nested-register">
					<p>decidiq</p>
				</CnSettingsSection>
			</div>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnSettingsSection from '../../../src/components/CnSettingsSection/CnSettingsSection.vue'

import '../../../src/css/index.css'

export default {
	name: 'AdminNestedSections',

	components: { CnAdminSettingsShell, CnSettingsSection },
}
</script>
