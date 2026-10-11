<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  screens-relation-pages (?relation=person). A person page as the canonical
  manifest configures it: the real CnDetailPage in the board look, a tab strip
  whose Overview holds a stack of widgets, and a side column. The registry
  holds one static card type, so the stack measures without a server.
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
			:sideColumn="['side-note']" />
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
							{ widgetId: 'person-cases', label: 'Cases' },
						],
					},
				},
				{ id: 'person-card', type: 'data', title: 'Resident', content: { columns: 2, editable: false, include: ['name', 'birthDate'] } },
				{ id: 'person-cases', type: 'harness-note', title: 'Cases', content: { title: 'Cases', text: 'Two cases.' } },
				{ id: 'person-moments', type: 'harness-note', title: 'Latest contact moments', content: { title: 'Latest contact moments', text: 'Three moments.' } },
				{ id: 'side-note', type: 'harness-note', title: 'Home address', content: { title: 'Home address', text: 'Parkstraat 24' } },
			],

			layout: [
				{ id: '1', widgetId: 'person-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 8 },
			],
		}
	},
}
</script>
