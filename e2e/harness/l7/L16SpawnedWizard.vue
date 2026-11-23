<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A board-look wizard opened with spawnDialog (?l7=l16-spawned-wizard), as
  shillinq's Generate invoices dialog: a fresh app with no provides, the
  wizard asking for the board look itself.
-->
<template>
	<div data-testid="l16-spawned-wizard">
		<button type="button" data-testid="l16-open-wizard" @click="open">
			Open
		</button>
	</div>
</template>

<script>
import { spawnDialog } from '@nextcloud/vue/functions/dialog'
import { defineComponent, h } from 'vue'
import CnWizardDialog from '../../../src/components/CnWizardDialog/CnWizardDialog.vue'

import '../../../src/css/index.css'

const Wizard = defineComponent({
	name: 'L16Wizard',
	emits: ['close'],
	render() {
		return h(CnWizardDialog, {
			look: 'board',
			dialogTitle: 'Facturen genereren',
			eyebrowContext: 'Verkoopfacturen',
			steps: [{ id: 'source', label: 'Bron' }, { id: 'lines', label: 'Regels kiezen' }],
			onClose: () => this.$emit('close'),
		}, {
			'step-source': () => h('p', 'Kies een klant'),
			'step-lines': () => h('p', 'Kies regels'),
		})
	},
})

export default {
	name: 'L16SpawnedWizard',

	methods: {
		open() {
			spawnDialog(Wizard, {})
		},
	},
}
</script>
