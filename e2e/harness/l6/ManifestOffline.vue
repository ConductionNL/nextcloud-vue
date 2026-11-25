<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The manifest offline block end to end (?l6=manifest-offline,
  manifest-offline-block task 6): download a take-along set, lose the
  connection, list and open a record with its download time, submit an
  offline form, and send it once the connection is back. The object API is
  stubbed by the spec. The page wires what CnPageRenderer and CnAppRoot wire
  in an app: `offlineTakeAlong` on the list and the record, `offline` on the
  form, and a drain of the form's register and schema on `online`.
-->
<template>
	<div data-testid="l6-manifest-offline">
		<button type="button" data-testid="mo-download" @click="download">
			Download
		</button>
		<span data-testid="mo-downloaded">{{ downloaded }}</span>
		<span data-testid="mo-sent">{{ sent }}</span>

		<CnIndexPage
			title="Inspections"
			register="toezicht"
			schema="inspection"
			:objects="[]"
			:columns="[{ key: 'title', label: 'Title' }]"
			offlineTakeAlong />

		<CnDetailPage
			title="Inspection"
			register="toezicht"
			schema="inspection"
			objectId="i1"
			:objectStore="store"
			showEditAction
			offlineTakeAlong />

		<CnFormPage
			title="Inspection report"
			register="toezicht"
			schema="report"
			mode="create"
			:fields="[{ key: 'finding', label: 'Finding', type: 'string' }]"
			offline />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnDetailPage from '../../../src/components/CnDetailPage/CnDetailPage.vue'
import CnFormPage from '../../../src/components/CnFormPage/CnFormPage.vue'
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveDeviceId } from '../../../src/integrations/offline/offlineDb.js'
import { drainQueue } from '../../../src/integrations/offline/syncReplayService.js'
import { downloadTakeAlong } from '../../../src/integrations/offline/takeAlong.js'

const MANIFEST = {
	pages: [
		{ id: 'inspections', type: 'index', config: { register: 'toezicht', schema: 'inspection' } },
		{ id: 'report', type: 'form', config: { register: 'toezicht', schema: 'report' } },
	],
	offline: {
		takeAlong: [{ schema: 'inspection', limit: 50, ttlHours: 12 }],
		forms: ['report'],
	},
}

export default {
	name: 'ManifestOffline',

	components: { CnDetailPage, CnFormPage, CnIndexPage },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			downloaded: '',
			sent: '',
			// A store that cannot reach the server for the record: offline, the page reads the device.
			store: {
				schemas: { 'toezicht-inspection': { title: 'Inspection', properties: { title: { type: 'string' } } } },
				objects: {},
				fetchObject: () => Promise.reject(new Error('Network Error')),
				fetchSchema: () => Promise.resolve(),
				getError: () => null,
			},
		}
	},

	mounted() {
		window.addEventListener('online', this.drain)
	},

	beforeUnmount() {
		window.removeEventListener('online', this.drain)
	},

	methods: {
		async download() {
			const outcomes = await downloadTakeAlong(MANIFEST)
			this.downloaded = String(outcomes.reduce((sum, outcome) => sum + outcome.count, 0))
		},

		async drain() {
			const tally = await drainQueue(resolveDeviceId(), {}, { filter: (row) => row.register === 'toezicht' && row.schema === 'report' })
			this.sent = String(tally.synced)
		},
	},
}
</script>
