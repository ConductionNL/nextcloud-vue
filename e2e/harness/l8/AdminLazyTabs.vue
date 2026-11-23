<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The admin settings shell with `lazyTabs` (?l8=admin-lazy-tabs,
  admin-settings-lazy-tabs): each tab's panel mounts only while its tab is
  open. Every panel counts its mounts in `window.__adminLazyMounts`.
-->
<template>
	<div style="width: 1100px" data-testid="admin-lazy-tabs">
		<CnAdminSettingsShell
			appId="launchpad"
			appName="Launchpad"
			look="board"
			title="Launchpad"
			:tabs="tabs"
			lazyTabs
			tabsVariant="underline"
			:showVersionCard="false">
			<template #tab-general>
				<LazyPanel name="general" />
			</template>
			<template #tab-templates>
				<LazyPanel name="templates" />
			</template>
			<template #tab-sharing>
				<LazyPanel name="sharing" />
			</template>
		</CnAdminSettingsShell>
	</div>
</template>

<script>
import { NcSettingsSection } from '@nextcloud/vue'
import CnAdminSettingsShell from '../../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'

import '../../../src/css/index.css'

const LazyPanel = {
	name: 'LazyPanel',
	components: { NcSettingsSection },
	props: { name: { type: String, required: true } },
	mounted() {
		window.__adminLazyMounts = window.__adminLazyMounts || []
		window.__adminLazyMounts.push(this.name)
	},
	template: '<NcSettingsSection :name="name" :data-testid="`lazy-panel-${name}`" description="A panel." />',
}

export default {
	name: 'AdminLazyTabs',

	components: { CnAdminSettingsShell, LazyPanel },

	data() {
		return {
			tabs: [
				{ id: 'general', label: 'General' },
				{ id: 'templates', label: 'Templates' },
				{ id: 'sharing', label: 'Sharing' },
			],
		}
	},
}
</script>
