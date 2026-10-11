<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts of screens-detail-page-parity that only a real browser can
  measure (?screensdetail=tabs). The real CnDetailPage renders in the board look
  (`cnLook: board`) with a fake object store and a widget registry that holds one
  static card type, so nothing reaches a server. The body grid holds a `tabs`
  widget; the side column holds two cards. `&plain=1` mounts the same page
  without the look. `&w=<px>` sets the width of the box the page sits in.
  `&header=1` adds a status pill, a breadcrumb and a meta line, the header's
  row 2 (screens-detail-header-row-parity).
-->
<template>
	<div :style="{ width: width + 'px' }" data-testid="screensdetail-box">
		<CnDetailPage
			title="Roof extension Main Street 12"
			register="reg"
			schema="case"
			objectId="id-1"
			:objectStore="store"
			:subscribe="false"
			:showRelatedObjects="false"
			:widgets="widgets"
			:layout="layout"
			:sideColumn="['w-deadline', 'w-requester']"
			:statusPill="header ? { field: 'status', colorMap: { open: 'success' }, labels: { open: 'Open' } } : null"
			:breadcrumb="header ? { label: 'Cases', href: '#cases', currentField: 'identifier', separator: '/' } : null"
			:headerMeta="header ? 'via {channel}' : ''" />
	</div>
</template>

<script>
import { h } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

/**
 * A static card for the harness: a paragraph of text and a fixed height, so
 * the measurement does not depend on data arriving.
 */
const HarnessNote = {
	name: 'HarnessNote',
	props: {
		content: { type: Object, default: () => ({}) },
	},
	render() {
		return h('div', { class: 'harness-note', style: { minHeight: (this.content.height || 120) + 'px' } }, [
			h('p', this.content.text || 'Note'),
		])
	},
}

const record = { id: 'id-1', title: 'Roof extension Main Street 12', identifier: '2026-0082', status: 'open', channel: 'Mijn Zuiddrecht' }
const caseSchema = { title: 'Case', properties: { title: { type: 'string', title: 'Title' }, identifier: { type: 'string', title: 'Identifier' }, status: { type: 'string', title: 'Status' }, channel: { type: 'string', title: 'Channel' } } }

export default {
	name: 'ScreensDetailHarness',

	components: { CnDetailPage },

	provide() {
		return {
			cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board',
			cnRegistry: { 'harness-note': HarnessNote },
		}
	},

	data() {
		return {
			width: Number(params.get('w') || 1240),
			header: params.get('header') === '1',
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
				{ id: 'case-tabs', type: 'tabs', content: { tabs: [{ widgetId: 'case-overview', label: 'Overview' }, { widgetId: 'case-docs', label: 'Documents' }] } },
				{ id: 'case-overview', type: 'harness-note', title: 'Overview', content: { text: 'The application, its location and the decision so far.', height: 240 } },
				{ id: 'case-docs', type: 'harness-note', title: 'Documents', content: { text: 'Three documents.' } },
				{ id: 'w-deadline', type: 'harness-note', title: 'Deadline', content: { text: '12 November 2026' } },
				{ id: 'w-requester', type: 'harness-note', title: 'Requester', content: { text: 'Anouk Bakker' } },
			],

			layout: [
				{ id: '1', widgetId: 'case-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6 },
			],
		}
	},
}
</script>
