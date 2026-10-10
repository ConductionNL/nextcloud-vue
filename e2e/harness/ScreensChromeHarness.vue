<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The board chrome of screens-chrome-parity that only a real browser can
  measure (?screenschrome=index|detail|overview|settings; `overview` is the dashboard,
  because App.vue already routes any address containing `dash` elsewhere): the real CnAppNav
  beside a real page inside NcContent, as an app lays them out, so the
  navigation toggle overlays the content exactly as it does in Nextcloud.
  The page renders in the board look (`cnLook: board`); `&plain=1` mounts the
  same layout without it. The test closes the navigation with its own toggle.
-->
<template>
	<div :class="plain ? 'screens-chrome' : 'screens-chrome cn-look-board'" data-testid="screenschrome-box">
		<NcContent appName="harness">
			<CnAppNav :manifest="navManifest" :translate="(key) => key" />
			<NcAppContent>
				<CnIndexPage
					v-if="scenario === 'index'"
					title="Cases"
					:schema="schema"
					:objects="rows"
					:loading="false"
					:showRefresh="false"
					:showTitle="true"
					:pagination="{ total: 5, page: 1, pages: 1, limit: 20 }"
					:headerButtons="[{ action: 'export', label: 'Download', variant: 'secondary' }, { action: 'add', label: 'New case', variant: 'primary' }]" />

				<CnDetailPage
					v-else-if="scenario === 'detail'"
					title="Roof extension Main Street 12"
					register="reg"
					schema="case"
					objectId="id-1"
					:objectStore="store"
					:subscribe="false"
					:showRelatedObjects="false"
					:widgets="widgets"
					:layout="layout"
					:sideColumn="['w-deadline']" />

				<CnDashboardPage
					v-else-if="scenario === 'overview'"
					title="Dashboard"
					description="Good morning, Pieter"
					:layout="[]"
					:widgets="[]"
					:allowEdit="true" />

				<CnSettingsPage
					v-else-if="scenario === 'settings'"
					title="Settings"
					description="How this app works for your organisation."
					saveMode="page"
					:showTitle="true"
					:sections="sections" />
			</NcAppContent>
		</NcContent>
	</div>
</template>

<script>
import { NcAppContent, NcContent } from '@nextcloud/vue'
import { h } from 'vue'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnSettingsPage from '../../src/components/CnSettingsPage/CnSettingsPage.vue'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

/** A static card for the detail scenario, so nothing waits on data. */
const HarnessNote = {
	name: 'HarnessNote',
	props: {
		content: { type: Object, default: () => ({}) },
	},

	render() {
		return h('div', { class: 'harness-note', style: { minHeight: '120px' } }, [h('p', this.content.text || 'Note')])
	},
}

const record = { id: 'id-1', title: 'Roof extension Main Street 12' }
const caseSchema = { title: 'Case', properties: { title: { type: 'string', title: 'Title' } } }

export default {
	name: 'ScreensChromeHarness',

	components: { CnAppNav, CnDashboardPage, CnDetailPage, CnIndexPage, CnSettingsPage, NcAppContent, NcContent },

	provide() {
		return {
			cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board',
			cnRegistry: { 'harness-note': HarnessNote },
		}
	},

	data() {
		const rows = []
		for (let i = 1; i <= 5; i++) {
			rows.push({ id: String(i), title: `Case ${i}`, status: i % 2 ? 'open' : 'closed' })
		}
		return {
			scenario: params.get('screenschrome') || 'index',
			plain: params.get('plain') === '1',
			rows,
			schema: { title: 'Case', properties: { title: { type: 'string', title: 'Title' }, status: { type: 'string', title: 'Status', enum: ['open', 'closed'] } } },
			store: {
				objects: { 'reg-case': { 'id-1': record } },
				schemas: { case: caseSchema },
				objectTypeRegistry: {},
				registerObjectType() {},
				async fetchObject() {
					return record
				},

				async fetchSchema() {
					return caseSchema
				},
			},

			widgets: [
				{ id: 'case-tabs', type: 'tabs', content: { tabs: [{ widgetId: 'case-overview', label: 'Overview' }] } },
				{ id: 'case-overview', type: 'harness-note', title: 'Overview', content: { text: 'The application.' } },
				{ id: 'w-deadline', type: 'harness-note', title: 'Deadline', content: { text: '12 November 2026' } },
			],

			layout: [{ id: '1', widgetId: 'case-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
			sections: [{ id: 'general', title: 'General', fields: [{ key: 'name', label: 'Name', type: 'text' }] }],
			navManifest: {
				version: '1.0.0',
				pages: [],
				menu: [
					{ id: 'dashboard', label: 'Dashboard', href: '#dashboard', order: 1 },
					{ id: 'cases', label: 'Cases', href: '#cases', order: 2 },
				],
			},
		}
	},
}
</script>
