<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The count line under an index title with a singular and a plural form
  (?l7=index-count-plural), as shillinq's invoice list: one list of one
  invoice, one of twelve.
-->
<template>
	<div class="cn-look-board" style="width: 1100px">
		<div data-testid="count-one">
			<CnIndexPage
				title="Facturen"
				:objects="one"
				:columns="columns"
				:loading="false"
				:showTitle="true"
				:countSubtitle="forms"
				:pagination="{ total: 1, page: 1, pages: 1, limit: 20 }" />
		</div>
		<div data-testid="count-many">
			<CnIndexPage
				title="Facturen"
				:objects="one"
				:columns="columns"
				:loading="false"
				:showTitle="true"
				:countSubtitle="forms"
				:pagination="{ total: 12, page: 1, pages: 12, limit: 1 }" />
		</div>
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'IndexCountPlural',

	components: { CnIndexPage },

	data() {
		return {
			columns: [{ key: 'number', label: 'Factuurnummer' }],
			one: [{ id: '1', number: 'F-2026-0001' }],
			forms: { singular: '{total} factuur', plural: '{total} facturen' },
		}
	},
}
</script>
