<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A detail page that names the record by a field (?l7=detail-title-field), as
  shillinq's invoice page names the invoice number where OpenRegister's
  `@self.name` holds the schema title "Debiteurenfactuur".
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="detail-title-field">
		<CnDetailPage
			title="Factuur"
			register="reg"
			schema="invoice"
			objectId="inv-1"
			titleField="number"
			:objectStore="store"
			:subscribe="false"
			:showRelatedObjects="false" />
	</div>
</template>

<script>
import CnDetailPage from '../../../src/components/CnDetailPage/CnDetailPage.vue'

import '../../../src/css/index.css'

const record = { id: 'inv-1', '@self': { name: 'Debiteurenfactuur' }, number: 'F-2026-0001' }
const schema = { title: 'Debiteurenfactuur', properties: { number: { type: 'string', title: 'Factuurnummer' } } }

export default {
	name: 'DetailTitleField',

	components: { CnDetailPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			store: {
				objects: { 'reg-invoice': { 'inv-1': record } },
				schemas: { invoice: schema },
				objectTypeRegistry: {},
				registerObjectType() {},
				async fetchObject() {
					return record
				},

				async fetchSchema() {
					return schema
				},
			},
		}
	},
}
</script>
