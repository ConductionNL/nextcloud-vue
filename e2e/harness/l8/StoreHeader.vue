<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The store page under the board look with the navigation open
  (?l8=store-header): its title sits flush with the content, as board LpStore
  draws it. The spec stubs the app's store endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="store-header-host">
		<CnStorePage
			app="launchpad"
			title="Store"
			description="Templates and adapters for your start page." />
	</div>
</template>

<script>
import CnStorePage from '../../../src/components/CnStorePage/CnStorePage.vue'

import '../../../src/css/index.css'

export default {
	name: 'StoreHeader',

	components: { CnStorePage },

	provide() {
		return { cnLook: 'board' }
	},
}
</script>
