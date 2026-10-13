<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A meetings index whose Voorzitter column holds a participant uuid and draws
  the participant's initials and name (?l8=chair-avatar). The reads are
  stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="chair-avatar">
		<CnIndexPage
			title="Vergaderingen"
			register="decidiq"
			schema="meeting"
			:columns="columns"
			:showRefresh="false" />
	</div>
</template>

<script>
import CnIndexPage from '../../../src/components/CnIndexPage/CnIndexPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'ChairAvatar',

	components: { CnIndexPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			columns: [
				{ key: 'title', label: 'Vergadering' },
				{ key: 'chair', label: 'Voorzitter', widget: 'avatar', widgetProps: { size: 28, resolve: { register: 'decidiq', schema: 'participant', labelField: 'fullName' } } },
			],
		}
	},
}
</script>
