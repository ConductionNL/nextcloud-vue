<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Help text under form fields in a real browser (?fieldhint=1): a CnFormDialog
  with plain text, e-mail and number inputs and a select, each with a
  description, shaped like pipelinq's contact dialog. A spec reads where each
  help line starts against the bottom edge of its control; jsdom lays out
  nothing, so that claim cannot be judged there.
-->
<template>
	<div class="field-hint-harness">
		<CnFormDialog
			:schema="schema"
			:recoverDraft="false"
			:look="plain ? 'nextcloud' : 'board'"
			dialogTitle="New contact" />
	</div>
</template>

<script>
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

import '../../src/css/look-board.css'
import '../../src/css/form-field.css'
import '../../src/css/dialog.css'

export default {
	name: 'FieldHintHarness',
	components: { CnFormDialog },
	data() {
		return {
			plain: /[?&]plain=/.test(window.location.search),
			schema: {
				title: 'Contact',
				slug: 'contact',
				properties: {
					role: {
						type: 'string',
						title: 'Role',
						description: 'Job title or role within the organisation',
					},

					email: {
						type: 'string',
						format: 'email',
						title: 'Email',
						description: 'The address messages go to',
					},

					employees: {
						type: 'integer',
						title: 'Employees',
						description: 'How many people work there',
					},

					preferredChannel: {
						type: 'string',
						title: 'Preferred channel',
						description: 'How this contact likes to be reached',
						enum: ['email', 'phone'],
					},
				},
			},
		}
	},
}
</script>
