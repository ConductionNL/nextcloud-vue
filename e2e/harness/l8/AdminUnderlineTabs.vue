<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The admin settings shell with an underline tab strip (?l8=admin-underline-tabs,
  admin-settings-underline-tabs, board LpBeheerAlgemeen).
-->
<template>
	<div style="width: 1100px" data-testid="admin-underline-tabs">
		<CnAdminSettingsShell
			appId="launchpad"
			appName="Launchpad"
			look="board"
			title="Launchpad-beheer: algemeen"
			:tabs="tabs"
			tabsVariant="underline"
			:showReimport="false"
			:showSupport="false"
			appVersion="1.0.0">
			<NcSettingsSection name="Standaard dashboard" description="Wat een nieuwe gebruiker ziet." />
			<template #tab-sjablonen>
				<NcSettingsSection name="Sjablonen" description="Startdashboards per rol." />
			</template>
			<template #tab-delen>
				<NcSettingsSection name="Delen" description="Wie dashboards mag delen." />
			</template>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import { NcSettingsSection } from '@nextcloud/vue'
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'

import '../../../src/css/index.css'

export default {
	name: 'AdminUnderlineTabs',

	components: { CnAdminSettingsShell, NcSettingsSection },

	data() {
		return {
			tabs: [
				{ id: 'algemeen', label: 'Algemeen' },
				{ id: 'sjablonen', label: 'Sjablonen' },
				{ id: 'delen', label: 'Delen' },
			],
		}
	},
}
</script>
