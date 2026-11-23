<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  screens-relation-pages (?relation=person). A person page as the canonical
  manifest configures it: the real CnDetailPage in the board look, a tab strip
  whose Overview holds a stack of widgets (the record's data card and two
  record lists), and a side column. The record lists read
  /apps/openregister/api/objects/..., which the e2e answers with page.route.
  `&plain=1` mounts the same page without the look.
-->
<template>
	<div style="width: 1180px" data-testid="relation-box">
		<CnDetailPage
			title="Sanne de Vries"
			register="reg"
			schema="person"
			objectId="p-1"
			:objectStore="store"
			:subscribe="false"
			:showRelatedObjects="false"
			:widgets="widgets"
			:layout="layout"
			:sideColumn="['side-identity', 'side-channels', 'side-open', 'side-note']" />
	</div>
</template>

<script>
import { h } from 'vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { CnWidgetWrapper } from '../../src/components/CnWidgetWrapper/index.js'

import '../../src/css/index.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

/**
 * A static self-titled card of a fixed height, so the layout does not wait on
 * data. It draws its own CnWidgetWrapper, as a title-owning widget does.
 */
const HarnessNote = {
	name: 'HarnessNote',
	props: {
		content: { type: Object, default: () => ({}) },
		title: { type: String, default: '' },
	},
	render() {
		return h(CnWidgetWrapper, { title: this.title || this.content.title || '', showActions: false }, {
			default: () => h('div', { class: 'harness-note', style: { minHeight: (this.content.height || 80) + 'px' } }, [
				h('p', this.content.text || 'Note'),
			]),
		})
	},
}

const record = {
	id: 'p-1',
	name: 'Sanne de Vries',
	birthDate: '1986-03-14',
	bsn: '123457609',
	email: 's.devries@example.nl',
	phone: '06 12 34 56 78',
	address: { street: 'Parkstraat', number: '24', postcode: '3311 AB', city: 'Zuiddrecht' },
}
const personSchema = { title: 'Person', properties: { name: { type: 'string', title: 'Name' }, birthDate: { type: 'string', format: 'date', title: 'Birth date' } } }

export default {
	name: 'RelationPagesHarness',

	components: { CnDetailPage },

	provide() {
		return {
			cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board',
			cnRegistry: { 'harness-note': HarnessNote },
		}
	},

	data() {
		return {
			store: {
				objects: { 'reg-person': { 'p-1': record } },
				schemas: { person: personSchema, 'reg-person': personSchema },
				objectTypeRegistry: {},
				registerObjectType() {},
				async fetchObject() {
					return record
				},

				async fetchSchema() {
					return personSchema
				},
			},

			widgets: [
				{
					id: 'person-tabs',
					type: 'tabs',
					content: {
						tabs: [
							{ widgetIds: ['person-card', 'person-cases', 'person-moments'], label: 'Overview' },
							{ widgetId: 'side-note', label: 'Cases' },
						],
					},
				},
				{ id: 'person-card', type: 'data', title: 'Resident', content: { columns: 2, editable: false, include: ['name', 'birthDate'] } },
				{
					id: 'person-cases',
					type: 'record-list',
					title: 'Cases',
					content: {
						register: 'reg',
						schema: 'case',
						filter: { requester: '@objectId' },
						title: '{title}',
						meta: '{identifier} · {caseTypeName}',
						pill: { field: 'status', labels: { open: 'In progress', closed: 'Closed' }, colorMap: { open: 'purple', closed: 'success' } },
						trailing: ['Done {closedAt|date}', 'Due {deadline|date}'],
						headerLink: { label: 'View all {total} cases', href: '#cases' },
					},
				},
				{
					id: 'person-moments',
					type: 'record-list',
					title: 'Latest contact moments',
					content: {
						register: 'reg',
						schema: 'moment',
						filter: { contact: '@objectId' },
						presentation: 'feed',
						icon: { field: 'channel', map: { phone: 'Phone' }, default: 'EmailOutline' },
						meta: '{startTime|datetime} · {channel}',
						text: '{summary}',
						headerNote: '{total} in total',
					},
				},
				{
					id: 'side-identity',
					type: 'facts',
					title: 'Identity',
					content: {
						fields: [
							{ as: 'lead', key: 'digid', icon: 'ShieldAccountOutline', tone: 'success', title: [{ text: 'Signed in with DigiD' }], subtitle: [{ text: 'at the contact moment of 4 October' }] },
							{ label: 'BSN', path: 'bsn', format: 'masked', reveal: true },
							{ as: 'line', key: 'logged', text: 'Showing the BSN is logged.' },
						],
					},
				},
				{
					id: 'side-channels',
					type: 'facts',
					title: 'Contact channels',
					content: {
						fields: [
							{ label: 'Email', path: 'email', format: 'email', copy: true },
							{ label: 'Phone', path: 'phone', format: 'phone' },
						],

						headerAction: { label: 'Add', icon: 'Plus', type: 'handler', handler: 'noop' },
					},
				},
				{
					id: 'side-open',
					type: 'record-list',
					title: 'Open cases',
					content: { register: 'reg', schema: 'case', filter: { requester: '@objectId', status: 'open' }, limit: 1, title: '{title}', meta: '{identifier}', pill: { field: 'status', colorMap: { open: 'purple' } }, trailing: 'Due {deadline|date}' },
				},
				{ id: 'side-note', type: 'harness-note', title: 'Home address', content: { title: 'Home address', text: 'Parkstraat 24' } },
			],

			layout: [
				{ id: '1', widgetId: 'person-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 16 },
			],
		}
	},
}
</script>
