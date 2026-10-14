<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A Nextcloud text area and text field with a label and a placeholder under
  the board look (?l7=board-textarea-label), with the theme rule that showed
  the placeholder under the label (thematiq's nldesign system:
  `::placeholder { opacity: 1 !important }`), as the dossiq DqTaak notes field.
-->
<template>
	<div class="cn-look-board" style="width: 600px; padding: 20px" data-testid="board-textarea-label">
		<component :is="styleTag">
			::placeholder { opacity: 1 !important; }
		</component>
		<NcTextArea
			v-model="note"
			label="Een notitie toevoegen"
			placeholder="Wat heb je gevonden, wie heb je gebeld?"
			data-testid="board-textarea" />
		<NcTextField
			v-model="name"
			label="Naam"
			placeholder="Bijvoorbeeld Jan"
			data-testid="board-textfield" />
	</div>
</template>

<script>
import { NcTextArea, NcTextField } from '@nextcloud/vue'

import '../../../src/css/index.css'

export default {
	name: 'BoardTextareaLabel',

	components: { NcTextArea, NcTextField },

	data() {
		return { note: '', name: '', styleTag: 'style' }
	},
}
</script>
