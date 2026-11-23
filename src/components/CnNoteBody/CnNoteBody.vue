<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<span class="cn-note-body" data-testid="cn-note-body">
		<template v-for="(piece, index) in pieces" :key="index">
			<span
				v-if="piece.type === 'mention'"
				class="cn-note-body__mention cn-notes-tab__mention"
				:class="{
					'cn-note-body__mention--group': piece.kind === 'group',
					'cn-note-body__mention--unknown cn-notes-tab__mention--unknown': piece.kind !== 'group' && !names[piece.id],
				}"
				:data-testid="piece.kind === 'group' ? 'cn-note-group-chip' : 'cn-note-user-chip'">{{ chipText(piece) }}</span>
			<img
				v-else-if="piece.type === 'image'"
				class="cn-note-body__image"
				:src="piece.src"
				:alt="piece.alt"
				loading="lazy">
			<a
				v-else-if="piece.type === 'link'"
				class="cn-note-body__link"
				:href="piece.href"
				target="_blank"
				rel="noopener noreferrer">{{ piece.text }}</a>
			<template v-else>{{ piece.value }}</template>
		</template>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { parseNoteBody } from '../../utils/noteBody.js'

/**
 * CnNoteBody — the text of one note: plain text, `@mention` chips (users and
 * groups) and images. Nothing else becomes markup, so a note cannot restyle
 * the page. An image renders only when its URL is a file of the same record
 * served by OpenRegister; any other image URL shows as a link.
 *
 * Example:
 * ```vue
 * <CnNoteBody :message="note.message" :record="{ apiBase, register, schema, objectId }" :names="names" />
 * ```
 */
export default {
	name: 'CnNoteBody',

	props: {
		/** The raw note text. */
		message: {
			type: String,
			default: '',
		},

		/**
		 * The record the note belongs to, `{ apiBase, register, schema, objectId }`:
		 * only images that are files of this record are shown as images. Null shows
		 * every image as a link.
		 *
		 * @type {{apiBase: string, register: string, schema: string, objectId: string}|null}
		 */
		record: {
			type: Object,
			default: null,
		},

		/**
		 * Display names of mentioned users by id. An unresolved user shows its id
		 * as a muted chip; a group shows its id (its display name is Nextcloud's
		 * to give, resolved by the host through this map as `group/<gid>`).
		 *
		 * @type {Object<string, string>}
		 */
		names: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		pieces() {
			return parseNoteBody(this.message, this.record)
		},
	},

	methods: {
		/**
		 * @param {{id: string, kind: string, groupId?: string}} piece A mention.
		 * @return {string} The chip text.
		 */
		chipText(piece) {
			if (piece.kind === 'group') {
				return this.names[piece.id] || t('nextcloud-vue', 'Group {name}', { name: piece.groupId })
			}
			return this.names[piece.id] || piece.id
		},
	},
}
</script>

<style scoped>
.cn-note-body {
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.cn-note-body__mention {
	padding: 0 4px;
	background: var(--color-primary-element-light);
	border-radius: var(--border-radius);
}

.cn-note-body__mention--group {
	font-weight: bold;
}

.cn-note-body__mention--unknown {
	color: var(--color-text-maxcontrast);
}

.cn-note-body__image {
	display: block;
	max-width: 100%;
	max-height: 240px;
	margin: 4px 0;
	border-radius: var(--border-radius);
}
</style>
