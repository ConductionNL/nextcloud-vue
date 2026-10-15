<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  An empty index page for a Dutch reader (?l7=index-empty-dutch), as the
  shillinq lane saw it: the page names no empty text, so the library's own
  string shows, in Dutch. The page sets the language before it mounts.
-->
<template>
	<div style="width: 1100px" data-testid="index-empty-dutch">
		<CnIndexPage
			title="Facturen"
			:objects="[]"
			:columns="columns"
			:loading="false"
			:showTitle="true"
			:pagination="{ total: 0, page: 1, pages: 1, limit: 20 }" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'
import { registerTranslations } from '../../../src/l10n/index.js'

import '../../../src/css/index.css'

globalThis._nc_l10n_language = 'nl'
registerTranslations()

export default {
	name: 'IndexEmptyDutch',

	components: { CnIndexPage },

	data() {
		return {
			columns: [{ key: 'number', label: 'Factuurnummer' }],
		}
	},
}
</script>
