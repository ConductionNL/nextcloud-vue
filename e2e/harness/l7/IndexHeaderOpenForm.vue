<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An index page whose header button opens the create form
  (?l7=index-header-open-form), as the shillinq invoice list's
  "Nieuwe factuur": a `headerActions` entry of `type: "open-form"` named by a
  primary header button.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="index-header-open-form">
		<CnIndexPage
			title="Facturen"
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
	name: 'IndexHeaderOpenForm',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			schema: { title: 'Factuur', titlePlural: 'Facturen', properties: { number: { type: 'string', title: 'Factuurnummer' } } },
			columns: [{ key: 'number', label: 'Factuurnummer' }],
			rows: [{ id: '1', number: 'F-2026-0001' }],
			headerActions: [
				{ id: 'new-invoice', label: 'Nieuwe factuur', type: 'open-form', register: 'shillinq', schema: 'invoice', formTitle: 'Nieuwe factuur' },
			],
			headerButtons: [
				{ action: 'new-invoice', variant: 'primary', label: 'Nieuwe factuur', icon: 'Plus' },
			],
		}
	},
}
</script>
