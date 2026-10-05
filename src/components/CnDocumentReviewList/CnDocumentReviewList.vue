<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section
		class="cn-document-review-list"
		data-testid="cn-document-review-list"
		:aria-labelledby="title ? titleId : null"
		:aria-label="title ? null : fallbackLabel">
		<div v-if="title || rows.length > 0" class="cn-document-review-list__header">
			<component
				:is="titleTag"
				v-if="title"
				:id="titleId"
				class="cn-document-review-list__title">
				{{ title }}
			</component>
			<span
				v-if="rows.length > 0"
				class="cn-document-review-list__summary"
				data-testid="cn-document-review-summary">
				{{ summary }}
			</span>
		</div>

		<p v-if="rows.length === 0" class="cn-document-review-list__empty" data-testid="cn-document-review-empty">
			{{ emptyText }}
		</p>

		<ul v-else class="cn-document-review-list__rows">
			<li
				v-for="row in rows"
				:key="row.key"
				class="cn-document-review-list__row"
				data-testid="cn-document-review-row">
				<FileDocumentOutline class="cn-document-review-list__icon" :size="22" aria-hidden="true" />
				<span class="cn-document-review-list__text">
					<a
						v-if="row.href"
						class="cn-document-review-list__name"
						:href="row.href">
						{{ row.name }}
					</a>
					<span v-else class="cn-document-review-list__name">{{ row.name }}</span>
					<span v-if="row.meta" class="cn-document-review-list__meta">{{ row.meta }}</span>
				</span>
				<CnStatusBadge
					class="cn-document-review-list__status"
					:label="row.status.label"
					:variant="row.status.variant" />
				<!-- @slot row-action Replace the row's action button. -->
				<!-- @binding {object} document The row's document. -->
				<!-- @binding {object} status The row's resolved status ({ value, label, variant, reviewed }). -->
				<slot name="row-action" :document="row.document" :status="row.status">
					<NcButton
						v-if="rowActionLabel"
						variant="tertiary"
						:aria-label="`${rowActionLabel}: ${row.name}`"
						data-testid="cn-document-review-action"
						@click="$emit('row-action', row.document)">
						{{ rowActionLabel }}
					</NcButton>
				</slot>
			</li>
		</ul>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import { readPath } from '../../utils/readPath.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

let documentReviewListUid = 0

/**
 * CnDocumentReviewList: files that each need a verdict, and how far along you are.
 *
 * One row per file with its review status, a progress line ("2 of 5 reviewed")
 * and one action per row. Built for a disclosure request, where every document
 * is judged public, partly public or still to review, but the status field and
 * its values are yours to configure.
 *
 * ```vue
 * <CnDocumentReviewList
 *   title="Review documents"
 *   :documents="[
 *     { id: 1, name: 'Advice on street lighting', meta: 'PDF', reviewStatus: 'public' },
 *     { id: 2, name: 'Budget note', meta: 'Word, 2 February 2026' },
 *   ]"
 *   @row-action="openDocument" />
 * ```
 *
 * The `document-review` detail widget type renders this list from a field on
 * the record.
 */
export default {
	name: 'CnDocumentReviewList',

	components: {
		CnStatusBadge,
		FileDocumentOutline,
		NcButton,
	},

	props: {
		/** The documents, one object per row. */
		documents: {
			type: Array,
			default: () => [],
		},

		/** Heading of the list. */
		title: {
			type: String,
			default: '',
		},

		/** Element the heading renders as. */
		titleTag: {
			type: String,
			default: 'h3',
		},

		/** Dot-path to a document's display name. Falls back to `title`, then `filename`. */
		nameField: {
			type: String,
			default: 'name',
		},

		/** Dot-path to the line under the name (type, date, origin). */
		metaField: {
			type: String,
			default: 'meta',
		},

		/** Dot-path to a document's review status. */
		statusField: {
			type: String,
			default: 'reviewStatus',
		},

		/** Dot-path to a URL that opens the document. When a row has one, its name is a link. */
		hrefField: {
			type: String,
			default: 'href',
		},

		/** Dot-path to the value that identifies a row. */
		rowKey: {
			type: String,
			default: 'id',
		},

		/**
		 * The review statuses: `{ value, label, variant?, reviewed? }` each.
		 * `variant` is a CnStatusBadge variant. `reviewed: true` counts the
		 * row in the progress line. Empty uses the built-in three: public,
		 * partly public and to review.
		 */
		statuses: {
			type: Array,
			default: () => [],
		},

		/**
		 * The status of a document that carries none, or one this list does
		 * not know. Defaults to the first status that is not `reviewed`.
		 */
		defaultStatus: {
			type: String,
			default: '',
		},

		/** Label of the per-row action button. An empty string renders no button. */
		rowActionLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Review'),
		},

		/** Shown when there are no documents. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No documents to review.'),
		},
	},

	emits: [
		/** A row's action button was pressed. Payload: the document. */
		'row-action',
	],

	data() {
		documentReviewListUid += 1
		return {
			titleId: `cn-document-review-title-${documentReviewListUid}`,
		}
	},

	computed: {
		/**
		 * The statuses in effect: the configured ones, or the built-in three.
		 *
		 * @return {Array<{value: string, label: string, variant: string, reviewed: boolean}>} The statuses.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		effectiveStatuses() {
			const configured = (Array.isArray(this.statuses) ? this.statuses : [])
				.filter((status) => status && status.value !== undefined && status.value !== null)
				.map((status) => ({
					value: String(status.value),
					label: typeof status.label === 'string' && status.label !== '' ? status.label : String(status.value),
					variant: typeof status.variant === 'string' && status.variant !== '' ? status.variant : 'default',
					reviewed: status.reviewed === true,
				}))
			if (configured.length > 0) {
				return configured
			}
			return [
				{ value: 'public', label: t('nextcloud-vue', 'Public'), variant: 'success', reviewed: true },
				{ value: 'partly-public', label: t('nextcloud-vue', 'Partly public'), variant: 'warning', reviewed: true },
				{ value: 'to-review', label: t('nextcloud-vue', 'To review'), variant: 'default', reviewed: false },
			]
		},

		/**
		 * The status a document without a known one falls back to.
		 *
		 * @return {{value: string, label: string, variant: string, reviewed: boolean}} The fallback status.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		fallbackStatus() {
			const statuses = this.effectiveStatuses
			return statuses.find((status) => status.value === this.defaultStatus)
				|| statuses.find((status) => !status.reviewed)
				|| statuses[0]
		},

		/**
		 * The rows, with everything the template needs resolved.
		 *
		 * @return {Array<{key: string, name: string, meta: string, href: string, status: object, document: object}>} The rows.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		rows() {
			return (Array.isArray(this.documents) ? this.documents : [])
				.filter((document) => document && typeof document === 'object')
				.map((document, index) => {
					const raw = readPath(document, this.statusField)
					const wanted = raw === null || raw === undefined ? '' : String(raw).toLowerCase()
					const status = this.effectiveStatuses.find((candidate) => candidate.value.toLowerCase() === wanted)
						|| this.fallbackStatus
					const name = readPath(document, this.nameField) || document.title || document.filename || ''
					const key = readPath(document, this.rowKey)
					const href = readPath(document, this.hrefField)
					const meta = readPath(document, this.metaField)
					return {
						key: key === undefined || key === null ? `row-${index}` : String(key),
						name: String(name),
						meta: typeof meta === 'string' ? meta : '',
						href: typeof href === 'string' ? href : '',
						status,
						document,
					}
				})
		},

		/**
		 * How many rows carry a reviewed status.
		 *
		 * @return {number} The count.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		reviewedCount() {
			return this.rows.filter((row) => row.status.reviewed).length
		},

		/**
		 * The progress line, for example "2 of 5 reviewed".
		 *
		 * @return {string} The summary.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		summary() {
			return t('nextcloud-vue', '{reviewed} of {total} reviewed', {
				reviewed: this.reviewedCount,
				total: this.rows.length,
			})
		},

		/**
		 * Accessible name for a list without a title.
		 *
		 * @return {string} The label.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-document-review-list
		 */
		fallbackLabel() {
			return t('nextcloud-vue', 'Documents to review')
		},
	},
}
</script>

<style scoped>
.cn-document-review-list {
	display: flex;
	flex-direction: column;
	gap: calc(1.5 * var(--default-grid-baseline));
}

.cn-document-review-list__header {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: calc(2 * var(--default-grid-baseline));
	justify-content: space-between;
	margin-bottom: calc(2 * var(--default-grid-baseline));
}

.cn-document-review-list__title {
	font-size: 1.1em;
	font-weight: 700;
	margin: 0;
}

.cn-document-review-list__summary,
.cn-document-review-list__meta,
.cn-document-review-list__empty {
	color: var(--color-text-maxcontrast);
}

.cn-document-review-list__empty {
	margin: 0;
}

.cn-document-review-list__rows {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-document-review-list__row {
	align-items: center;
	border-top: 1px solid var(--color-border);
	display: flex;
	flex-wrap: wrap;
	gap: calc(3 * var(--default-grid-baseline));
	padding: calc(2.5 * var(--default-grid-baseline)) 0;
}

.cn-document-review-list__icon {
	color: var(--color-text-maxcontrast);
	flex: none;
}

.cn-document-review-list__text {
	display: flex;
	flex: 1 1 220px;
	flex-direction: column;
	min-width: 0;
}

.cn-document-review-list__name {
	font-weight: 500;
	overflow-wrap: anywhere;
}

a.cn-document-review-list__name {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-document-review-list__meta {
	font-size: 0.9em;
}

.cn-document-review-list__status {
	flex: none;
}
</style>
