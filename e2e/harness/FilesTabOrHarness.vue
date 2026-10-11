<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<!--
	The files tab on an OpenRegister object (?filestabor=1&register=&schema=&object=).

	The real CnFilesTab with its default `source: 'openregister'`: every request
	goes to /apps/openregister/api/..., which e2e/files-browser-openregister.e2e.js
	either answers itself or forwards to a live instance as a chosen user.
-->
<template>
	<div style="width: 720px; padding: 16px;">
		<CnFilesTab
			:objectId="objectId"
			:register="register"
			:schema="schema"
			:uploadButton="true"
			:dropOverlay="true"
			:dropHint="true" />
	</div>
</template>

<script>
import CnFilesTab from '../../src/components/CnObjectSidebar/CnFilesTab.vue'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'FilesTabOrHarness',
	components: { CnFilesTab },
	data() {
		return {
			register: params.get('register') || '20',
			schema: params.get('schema') || '35',
			objectId: params.get('object') || '6c3a711f-c480-467b-a25f-d6a9c888384d',
		}
	},
}
</script>
