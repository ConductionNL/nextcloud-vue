<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The interaction form in a 234px card (?l7=contact-form-fit), as pipelinq's
  "Nieuw contactmoment" at 1100 wide: channel, client, subject, summary and
  outcome in a card that narrow.
-->
<template>
	<div style="width: 234px; padding: 16px; box-sizing: border-box; overflow: hidden; background: #fff" data-testid="contact-form-fit">
		<CnInteractionFormWidget :content="content" />
	</div>
</template>

<script>
import CnInteractionFormWidget from '../../../src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'ContactFormFit',

	components: { CnInteractionFormWidget },

	data() {
		return {
			content: {
				register: 'harness',
				schema: 'contactmoment',
				clientSchema: 'client',
				channels: [{ value: 'telefoon', label: 'Phone' }, { value: 'email', label: 'Email' }],
				outcomes: [{ value: 'opgelost', label: 'Resolved' }],
				submitLabel: 'Save contact moment',
			},
		}
	},
}
</script>
