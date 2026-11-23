<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The store page as an app mounts it (?l7=store-page): the description comes
  from the manifest and goes through the app's translate, provided here as a
  small Dutch catalogue. The spec stubs the app's store endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 1000px" data-testid="store-page-host">
		<CnStorePage
			app="launchpad"
			title="Store"
			description="Templates and adapters for your start page." />
	</div>
</template>

<script>
import CnStorePage from '../../../src/components/CnStorePage/CnStorePage.vue'

import '../../../src/css/index.css'

const WORDS = {
	Store: 'Winkel',
	'Templates and adapters for your start page.': 'Sjablonen en koppelingen voor je startpagina.',
}

export default {
	name: 'StorePage',

	components: { CnStorePage },

	provide() {
		return { cnLook: 'board', cnTranslate: (key) => WORDS[key] || key }
	},
}
</script>
