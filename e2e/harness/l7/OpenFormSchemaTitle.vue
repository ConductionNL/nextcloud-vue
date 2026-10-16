<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An `open-form` header action named by a PascalCase schema title
  (?l7=open-form-schema-title), as shillinq's `APInvoice`, which the register
  holds under the title as written rather than its kebab form.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="open-form-schema-title">
		<CnIndexPage
			title="Inkoopfacturen"
			:schema="schema"
			:columns="columns"
			:objects="rows"
			:loading="false"
			:showTitle="true"
			:headerActions="headerActions"
			:headerButtons="headerButtons"
			:pagination="{ total: 1, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'OpenFormSchemaTitle',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: { title: 'Inkoopfactuur', titlePlural: 'Inkoopfacturen', properties: { number: { type: 'string', title: 'Factuurnummer' } } },
			columns: [{ key: 'number', label: 'Factuurnummer' }],
			rows: [{ id: '1', number: 'I-2026-0001' }],
			headerActions: [
				{ id: 'new-purchase-invoice', label: 'Nieuwe inkoopfactuur', type: 'open-form', register: 'shillinq', schema: 'APInvoice', formTitle: 'Nieuwe inkoopfactuur' },
			],

			headerButtons: [
				{ action: 'new-purchase-invoice', variant: 'primary', label: 'Nieuwe inkoopfactuur', icon: 'Plus' },
			],
		}
	},
}
</script>
