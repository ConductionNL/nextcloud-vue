<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="cn-offline-queue" data-testid="cn-offline-queue">
		<div v-if="loading" class="cn-offline-queue__loading">
			<NcLoadingIcon :size="24" />
		</div>

		<NcEmptyContent
			v-else-if="operations.length === 0"
			:name="t('nextcloud-vue', 'Nothing is waiting')"
			:description="t('nextcloud-vue', 'Everything captured on this device has reached the server.')"
			data-testid="cn-offline-queue-empty" />

		<template v-else>
			<!-- Waiting and stuck are counted apart. "12 waiting, 1 stuck" and
			     "13 waiting" are different sentences, and adding them says
			     neither. -->
			<p class="cn-offline-queue__summary" data-testid="cn-offline-queue-summary">
				{{ summaryLabel }}
			</p>

			<ul class="cn-offline-queue__list">
				<li
					v-for="operation in operations"
					:key="operation.id"
					class="cn-offline-queue__row"
					:data-testid="`cn-offline-queue-row-${operation.id}`">
					<div class="cn-offline-queue__row-main">
						<span class="cn-offline-queue__operation">
							{{ operationLabel(operation) }}
						</span>
						<!-- The status is a WORD. A coloured dot alone says
						     nothing to a reader who cannot see it, and this is
						     the surface that tells somebody their work is
						     stuck (WCAG 2.2 SC 1.4.1). -->
						<span
							class="cn-offline-queue__status"
							:class="`cn-offline-queue__status--${operation.status}`"
							:data-testid="`cn-offline-queue-status-${operation.id}`">
							{{ statusLabel(operation.status) }}
						</span>
					</div>

					<p class="cn-offline-queue__meta">
						{{ t('nextcloud-vue', 'Captured') }}: {{ operation.queuedAt }}
						<template v-if="operation.attemptCount > 0">
							· {{ t('nextcloud-vue', 'Attempts') }}: {{ operation.attemptCount }}
						</template>
					</p>

					<!-- What the SERVER said, verbatim. A generic "could not
					     sync" sends somebody to a helpdesk that also cannot
					     see this device. -->
					<p
						v-if="operation.lastError"
						class="cn-offline-queue__error"
						:data-testid="`cn-offline-queue-error-${operation.id}`">
						{{ operation.lastError }}
					</p>

					<p
						v-if="isPermissionLost(operation)"
						class="cn-offline-queue__error"
						:data-testid="`cn-offline-queue-permission-${operation.id}`">
						{{ t('nextcloud-vue', 'Your right to write this was withdrawn. Retrying cannot restore it; ask whoever administers the register.') }}
					</p>

					<!-- Where the conflict was filed, or that it was not. A row
					     that says "Conflict" and nothing else leaves somebody
					     believing a colleague can see it, when on this path
					     nobody can. -->
					<p
						v-if="operation.status === 'conflict' && operation.conflictScope === 'local'"
						class="cn-offline-queue__error"
						:data-testid="`cn-offline-queue-local-${operation.id}`">
						{{ t('nextcloud-vue', 'This clash is recorded on this device only. Nobody else can see it, so do not wait for somebody to pick it up.') }}
					</p>

					<div v-if="operation.status === 'conflict'" class="cn-offline-queue__row-actions">
						<NcButton
							:data-testid="`cn-offline-queue-mine-${operation.id}`"
							@click="resolve(operation, 'client_wins')">
							{{ t('nextcloud-vue', 'Keep mine') }}
						</NcButton>
						<NcButton
							:data-testid="`cn-offline-queue-theirs-${operation.id}`"
							@click="resolve(operation, 'server_wins')">
							{{ t('nextcloud-vue', 'Keep theirs') }}
						</NcButton>
						<NcButton
							v-if="canMerge(operation)"
							:data-testid="`cn-offline-queue-merge-${operation.id}`"
							@click="openMerge(operation)">
							{{ t('nextcloud-vue', 'Merge by hand') }}
						</NcButton>
					</div>

					<!-- The merge is field by field, and it names both sides in
					     words. "Yours" and "Theirs" beside the actual values is
					     the only form somebody can check before choosing; a
					     single Merge button that guesses is a choice made for
					     them. -->
					<div
						v-if="mergingId === operation.id"
						class="cn-offline-queue__merge"
						:data-testid="`cn-offline-queue-merge-panel-${operation.id}`">
						<div v-for="field in mergeFields" :key="field.field" class="cn-offline-queue__merge-field">
							<strong>{{ field.field }}</strong>
							<label>
								<input
									v-model="mergeChoices[field.field]"
									type="radio"
									:name="`merge-${operation.id}-${field.field}`"
									value="client"
									:data-testid="`cn-offline-queue-merge-mine-${field.field}`">
								{{ t('nextcloud-vue', 'Mine') }}: {{ asText(field.client) }}
							</label>
							<label>
								<input
									v-model="mergeChoices[field.field]"
									type="radio"
									:name="`merge-${operation.id}-${field.field}`"
									value="server"
									:data-testid="`cn-offline-queue-merge-theirs-${field.field}`">
								{{ t('nextcloud-vue', 'Theirs') }}: {{ asText(field.server) }}
							</label>
						</div>
						<NcButton
							:data-testid="`cn-offline-queue-merge-apply-${operation.id}`"
							@click="applyMerge(operation)">
							{{ t('nextcloud-vue', 'Save this merge') }}
						</NcButton>
					</div>

					<div v-if="operation.status === 'failed'" class="cn-offline-queue__row-actions">
						<NcButton
							v-if="isPermissionLost(operation) === false"
							:data-testid="`cn-offline-queue-retry-${operation.id}`"
							@click="retry(operation)">
							{{ t('nextcloud-vue', 'Try again') }}
						</NcButton>

						<!-- 🔴 THE WAY OUT WHEN THERE IS NO WAY THROUGH. An entry
						     that will never replay still holds what the inspector
						     wrote, and it is theirs. Copying it lets them paste
						     their own observation into a mail, a form or a note
						     instead of retyping it from memory or losing it.
						     Offered on a lost permission TOO: they may not write
						     it here any more, but they still wrote it. -->
						<NcButton
							:data-testid="`cn-offline-queue-copy-${operation.id}`"
							@click="copyCapture(operation)">
							{{ t('nextcloud-vue', 'Copy what I wrote') }}
						</NcButton>
					</div>

					<p
						v-if="copiedId === operation.id"
						class="cn-offline-queue__meta"
						:data-testid="`cn-offline-queue-copied-${operation.id}`"
						role="status">
						{{ copyMessage }}
					</p>
				</li>
			</ul>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import {
	applyConflictResolution,
	listQueue,
	requeueOperation,
} from '../../integrations/offline/offlineDb.js'
import { diffVersions } from '../../integrations/offline/syncQueueEngine.js'

/**
 * CnOfflineQueue — the work this device has captured and not yet handed over.
 *
 * 🔴 IT LISTS WHAT A COUNT HIDES. The leaf renders a pending badge, and
 * `countPending()` counts `pending`, `conflict` and `syncing`. An operation
 * that exhausted its retries or lost its permission is `failed`, so it drops
 * out of that number entirely while still sitting in this browser's IndexedDB.
 * An inspection a citizen stood beside somebody to give is then stranded with
 * no reader anywhere, which is worse than having refused it at the door.
 *
 * 🔴 NOTHING HERE DELETES ANYTHING. Not on failure, not on age, not to make a
 * number smaller. A queue that drops an entry to tidy itself has thrown away
 * somebody's morning, and it would do it silently.
 *
 * WHAT A FAILED ENTRY CAN DO. It stays, listed, with the server's own words and
 * its attempt count. It offers **Try again**, which re-queues it by hand and
 * starts the attempts over — never automatic, because an operation the server
 * refused five times will be refused a sixth and a queue that retries forever
 * never drains. A `permission_lost` entry offers no retry and says why: the
 * right to write is gone and no amount of trying brings it back.
 */
export default {
	name: 'CnOfflineQueue',

	components: { NcButton, NcEmptyContent, NcLoadingIcon },

	props: {
		/**
		 * Scope the list to one device. Empty lists every device's queue in
		 * this browser profile, which is only ever useful in a test.
		 */
		deviceId: {
			type: String,
			default: '',
		},

		/**
		 * The uid recorded as having settled a conflict. A conflict record that
		 * says a collision happened and not who decided it cannot answer the
		 * question it was filed for.
		 */
		resolvedBy: {
			type: String,
			default: '',
		},

		/** Poll interval in ms while a drain is running. Zero disables it. */
		refreshMs: {
			type: Number,
			default: 2000,
		},
	},

	emits: ['requeued', 'copy-refused', 'resolved'],

	data() {
		return {
			operations: [],
			loading: true,
			timer: null,
			/** The operation whose capture was last copied, for the confirmation line. */
			copiedId: '',
			/** What that confirmation says, which is not always success. */
			copyMessage: '',
			/** The operation whose merge panel is open. */
			mergingId: '',
			/** The differing fields being merged. */
			mergeFields: [],
			/** Per-field choice: 'client' or 'server'. */
			mergeChoices: {},
		}
	},

	computed: {
		/**
		 * How many operations are still expected to replay on their own.
		 *
		 * @return {number} The count.
		 */
		waitingCount() {
			return this.operations.filter((operation) => ['pending', 'syncing', 'conflict'].includes(operation.status)).length
		},

		/**
		 * How many will not replay again without somebody acting.
		 *
		 * @return {number} The count.
		 */
		stuckCount() {
			return this.operations.filter((operation) => operation.status === 'failed').length
		},

		/**
		 * The one line above the list.
		 *
		 * @return {string} The summary.
		 */
		summaryLabel() {
			if (this.stuckCount === 0) {
				return t('nextcloud-vue', '{count} waiting to be sent', { count: this.waitingCount })
			}

			return t(
				'nextcloud-vue',
				'{waiting} waiting to be sent, {stuck} stuck',
				{ waiting: this.waitingCount, stuck: this.stuckCount },
			)
		},
	},

	async mounted() {
		await this.load()
		if (this.refreshMs > 0) {
			this.timer = setInterval(() => this.load(), this.refreshMs)
		}
	},

	beforeUnmount() {
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
		}
	},

	methods: {
		t,

		/**
		 * Read the queue.
		 *
		 * @return {Promise<void>} Nothing.
		 */
		async load() {
			try {
				this.operations = await listQueue(this.deviceId)
			} catch {
				// An unreadable store leaves the last list on screen rather
				// than blanking it: "we cannot read the queue right now" must
				// never render as "there is nothing in the queue".
			} finally {
				this.loading = false
			}
		},

		/**
		 * Whether this entry's right to write is gone.
		 *
		 * @param {object} operation The queue row.
		 * @return {boolean} True when no retry can help.
		 */
		isPermissionLost(operation) {
			return operation.status === 'failed' && operation.lastError === 'permission_lost'
		},

		/**
		 * Whether a side-by-side merge is possible for this row.
		 *
		 * Only a concurrent edit has two versions to merge. A target deleted
		 * server-side has one, and offering a merge against nothing is a button
		 * that cannot do what it says.
		 *
		 * @param {object} operation The queue row.
		 * @return {boolean} True when both versions are present.
		 */
		canMerge(operation) {
			return operation.serverVersion !== null && operation.serverVersion !== undefined
		},

		/**
		 * Open the field-by-field merge for one row.
		 *
		 * Every field starts on the server's value. A merge panel that starts
		 * pre-set to the local answer is one Save away from silently discarding
		 * a colleague's edit, which is the outcome the whole surface exists to
		 * prevent.
		 *
		 * @param {object} operation The queue row.
		 * @return {void}
		 */
		openMerge(operation) {
			this.mergeFields = diffVersions(operation.payload ?? {}, operation.serverVersion ?? {})
			this.mergeChoices = Object.fromEntries(this.mergeFields.map((field) => [field.field, 'server']))
			this.mergingId = operation.id
		},

		/**
		 * One value as something readable in a label.
		 *
		 * @param {unknown} value The value.
		 * @return {string} Its text.
		 */
		asText(value) {
			if (value === null || value === undefined) {
				return t('nextcloud-vue', 'empty')
			}
			return typeof value === 'string' ? value : JSON.stringify(value)
		},

		/**
		 * Settle a conflict with one of the three choices.
		 *
		 * @param {object} operation     The queue row.
		 * @param {string} resolution    client_wins / server_wins / manual_merge.
		 * @param {object} [mergedPayload] The merged body, for a manual merge.
		 * @return {Promise<void>} Nothing.
		 */
		async resolve(operation, resolution, mergedPayload = null) {
			const settled = await applyConflictResolution({
				operationId: operation.id,
				resolution,
				mergedPayload,
				resolvedBy: this.resolvedBy,
			})

			if (settled === true) {
				/**
				 * @event resolved Emitted when a conflict was settled from the list. Payload: `{ id, resolution }`.
				 */
				this.$emit('resolved', { id: operation.id, resolution })
			}

			this.mergingId = ''
			await this.load()
		},

		/**
		 * Apply the field choices as a manual merge.
		 *
		 * @param {object} operation The queue row.
		 * @return {Promise<void>} Nothing.
		 */
		async applyMerge(operation) {
			const merged = { ...(operation.payload ?? {}) }
			for (const field of this.mergeFields) {
				merged[field.field] = this.mergeChoices[field.field] === 'server' ? field.server : field.client
			}

			await this.resolve(operation, 'manual_merge', merged)
		},

		/**
		 * Put one failed entry back in the queue.
		 *
		 * @param {object} operation The queue row.
		 * @return {Promise<void>} Nothing.
		 */
		async retry(operation) {
			const requeued = await requeueOperation(operation.id)
			if (requeued === true) {
				/**
				 * @event requeued Emitted when a failed operation was put back in the queue by hand. Payload: the operation id.
				 */
				this.$emit('requeued', operation.id)
			}

			await this.load()
		},

		/**
		 * Put the captured values on the clipboard.
		 *
		 * The payload as text, so somebody whose entry will never replay can
		 * paste what they wrote somewhere that works.
		 *
		 * It reports a failure rather than claiming success. An unavailable
		 * clipboard is ordinary on a field device: no secure context, denied
		 * permission — and "Copied" over an empty clipboard sends somebody away
		 * believing they have their words when they do not.
		 *
		 * @param {object} operation The queue row.
		 * @return {Promise<void>} Nothing.
		 */
		async copyCapture(operation) {
			const text = JSON.stringify((operation.payload ?? {}), null, 2)
			this.copiedId = operation.id

			try {
				await navigator.clipboard.writeText(text)
				this.copyMessage = t('nextcloud-vue', 'Copied. Paste it anywhere you can use it.')
			} catch {
				this.copyMessage = t(
					'nextcloud-vue',
					'This device would not let the app copy it, so it is shown below to copy by hand.',
				)
				/**
				 * @event copy-refused Emitted when the clipboard refused the capture, so a host can show the text for selection. Payload: `{ id, text }`.
				 */
				this.$emit('copy-refused', { id: operation.id, text })
			}
		},

		/**
		 * What this operation is, in words.
		 *
		 * @param {object} operation The queue row.
		 * @return {string} The label.
		 */
		operationLabel(operation) {
			const target = (operation.targetId || t('nextcloud-vue', 'a new record'))

			return `${operation.operationType} · ${operation.schema} · ${target}`
		},

		/**
		 * What a status means, in words rather than in a colour.
		 *
		 * @param {string} status The stored status.
		 * @return {string} The label.
		 */
		statusLabel(status) {
			const labels = {
				pending: t('nextcloud-vue', 'Waiting'),
				syncing: t('nextcloud-vue', 'Sending'),
				conflict: t('nextcloud-vue', 'Needs a decision'),
				failed: t('nextcloud-vue', 'Stuck'),
				synced: t('nextcloud-vue', 'Sent'),
			}

			return (labels[status] || status)
		},
	},
}
</script>

<style scoped>
.cn-offline-queue__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-offline-queue__row {
	border-block-end: 1px solid var(--color-border);
	padding: 8px 0;
}

.cn-offline-queue__merge {
	margin-block-start: 8px;
	padding: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-offline-queue__merge-field {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-block-end: 8px;
}

.cn-offline-queue__row-actions {
	display: flex;
	gap: 8px;
	margin-block-start: 8px;
}

.cn-offline-queue__row-main {
	display: flex;
	gap: 8px;
	justify-content: space-between;
}

.cn-offline-queue__summary,
.cn-offline-queue__meta {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-offline-queue__status {
	font-weight: bold;
}

/* The colour repeats the word beside it and never replaces it. */
.cn-offline-queue__status--failed {
	color: var(--color-error);
}

.cn-offline-queue__status--conflict {
	color: var(--color-warning);
}

.cn-offline-queue__status--synced {
	color: var(--color-success);
}

.cn-offline-queue__error {
	color: var(--color-error);
	margin: 4px 0 0 0;
}
</style>
