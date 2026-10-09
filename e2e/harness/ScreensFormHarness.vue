<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts of screens-form-parity, screens-dialog-parity and
  screens-wizard-parity that only a real browser can measure
  (?screensform=form|steps|dialog|wizard). The real components render in the
  board look (`cnLook: board`); `&plain=1` mounts the same surface without it.
  `&w=<px>` sets the width of the content box.
-->
<template>
	<div :class="plain ? '' : 'cn-look-board'" :style="{ width: width + 'px' }" data-testid="screensform-box">
		<CnFormPage
			v-if="scenario === 'form'"
			submitHandler="noop"
			:customComponents="{ noop: () => {} }"
			:fields="formFields" />

		<CnFormPage
			v-else-if="scenario === 'steps'"
			submitHandler="noop"
			:customComponents="{ noop: () => {} }"
			:fields="stepFields"
			:steps="steps"
			cancelRoute="/back" />

		<CnDialog
			v-else-if="scenario === 'dialog'"
			name="Delete publication"
			eyebrow="Publication"
			:noClose="noClose"
			@closing="closed = true">
			<p>Are you sure?</p>
			<template #actions>
				<NcButton variant="secondary">
					Cancel
				</NcButton>
				<NcButton variant="error">
					Delete
				</NcButton>
			</template>
		</CnDialog>

		<CnWizardDialog
			v-else-if="scenario === 'wizard'"
			dialogTitle="Import data"
			eyebrowContext="Import"
			:steps="wizardSteps"
			initialStep="b">
			<template #step-a>
				<p>Source</p>
			</template>
			<template #step-b>
				<p>Mapping</p>
			</template>
			<template #step-c>
				<p>Review</p>
			</template>
		</CnWizardDialog>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import CnDialog from '../../src/components/CnDialog/CnDialog.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnWizardDialog from '../../src/components/CnWizardDialog/CnWizardDialog.vue'

import '../../src/css/look-board.css'
import '../../src/css/form-field.css'
import '../../src/css/dialog.css'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

export default {
	name: 'ScreensFormHarness',

	components: { NcButton, CnDialog, CnFormPage, CnWizardDialog },

	provide() {
		return { cnLook: params.get('plain') === '1' ? 'nextcloud' : 'board' }
	},

	data() {
		return {
			scenario: params.get('screensform') || 'form',
			plain: params.get('plain') === '1',
			width: Number(params.get('w') || 800),
			noClose: params.get('noclose') === '1',
			closed: false,
			formFields: [
				{ key: 'title', label: 'Title', type: 'string', validation: { required: true } },
				{ key: 'first', label: 'First name', type: 'string', width: 'half' },
				{ key: 'last', label: 'Last name', type: 'string', width: 'half' },
				{ key: 'note', label: 'Note', type: 'string', help: 'A short hint.' },
			],

			stepFields: [
				{ key: 'a', label: 'Name', type: 'string', step: 'one' },
				{ key: 'b', label: 'City', type: 'string', step: 'two' },
			],

			steps: [
				{ id: 'one', title: 'Who', fields: ['a'] },
				{ id: 'two', title: 'Where', fields: ['b'] },
			],

			wizardSteps: [
				{ id: 'a', label: 'Source' },
				{ id: 'b', label: 'Mapping' },
				{ id: 'c', label: 'Review' },
			],
		}
	},
}
</script>
