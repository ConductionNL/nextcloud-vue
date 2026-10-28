<!--
  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<CnEmailPicker :apiBase="apiBase" @close="$emit('close')" @link="link" />
</template>

<script>
import { showError } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import CnEmailPicker from '../CnEmailPicker/CnEmailPicker.vue'
import { buildHeaders, prefixUrl } from '../../utils/index.js'

/**
 * CnEmailLinkDialog — "Link an email" on its own: the Mail picker, and the
 * picked message linked to the record (`POST .../{id}/emails`, as the email
 * tab does). An app opens it from any button, such as a card header action
 * (`{ "type": "open-modal", "target": "<its registry name>", "props": {
 * "register": "…", "schema": "…", "objectId": "@objectId" } }`).
 *
 * A message that is already linked counts as linked. After a link the
 * record's timelines read again (`cn:timeline:changed`).
 *
 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md#requirement-an-email-can-be-linked-from-a-card-header
 */
export default {
	name: 'CnEmailLinkDialog',

	components: { CnEmailPicker },

	props: {
		/** Register slug of the record. */
		register: { type: String, required: true },
		/** Schema slug of the record. */
		schema: { type: String, required: true },
		/** Id of the record. */
		objectId: { type: String, required: true },
		/** Base URL of the OpenRegister API. */
		apiBase: { type: String, default: '/apps/openregister/api' },
	},

	emits: ['close'],

	methods: {
		/**
		 * Link the picked message to the record.
		 *
		 * @param {object} pick `{ mailAccountId, messageId, messageUid }` from the picker.
		 * @return {Promise<void>}
		 */
		async link(pick) {
			let linked = false
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/emails`),
					{ method: 'POST', headers: { ...buildHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(pick) },
				)
				linked = response.ok === true || response.status === 409
			} catch {
				linked = false
			}
			if (!linked) {
				showError(t('nextcloud-vue', 'The email could not be linked. Try again.'))
				return
			}
			emit('cn:timeline:changed', { objectId: this.objectId, source: 'email-link' })
			this.$emit('close')
		},
	},
}
</script>
