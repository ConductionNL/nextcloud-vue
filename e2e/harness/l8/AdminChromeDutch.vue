<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The admin shell for a Dutch reader (?l8=admin-chrome-dutch,
  version-card-dutch-and-header, board PqBeheer): the version card in half
  the settings grid, beside a section whose header carries actions (the
  register mapping's save button). Nothing may overlap a card title, and the
  chrome reads in Dutch. The page sets the language before it mounts; the
  register list is stubbed by the spec.
-->
<template>
	<div style="width: 1000px" data-testid="admin-chrome-dutch">
		<CnAdminSettingsShell
			appId="pipelinq"
			appName="Pipelinq"
			look="board"
			appVersion="2.14.0"
			configuredVersion="2.14.0"
			:isUpToDate="true"
			:versionCardWide="false"
			:showSetup="true"
			:showHelp="true"
			helpRepo="ConductionNL/pipelinq">
			<CnRegisterMapping
				name="Registerconfiguratie met een lange titel die de knoppen raakt"
				:groups="groups"
				:configuration="{ register: '5' }"
				:showReimportButton="true" />
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'
import CnRegisterMapping from '../../../src/components/CnRegisterMapping/CnRegisterMapping.vue'
import { registerTranslations } from '../../../src/l10n/index.js'

import '../../../src/css/index.css'

globalThis._nc_l10n_language = 'nl'
registerTranslations()

export default {
	name: 'AdminChromeDutch',

	components: { CnAdminSettingsShell, CnRegisterMapping },

	data() {
		return {
			groups: [{ name: 'Pipelinq-objecten', types: [{ slug: 'client', label: 'Klant' }, { slug: 'contact', label: 'Contact' }] }],
		}
	},
}
</script>
