<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-search-index-status" data-testid="cn-search-index-status">
		<NcLoadingIcon v-if="loading" :size="24" :name="t('nextcloud-vue', 'Loading')" />
		<NcNoteCard v-else-if="error" type="error" data-testid="cn-search-index-error">
			{{ error }}
		</NcNoteCard>
		<template v-else>
			<dl class="cn-search-index-status__figures">
				<div>
					<dt>{{ t('nextcloud-vue', 'Tables in scope') }}</dt>
					<dd data-testid="cn-search-index-tables">
						{{ status.tableCount }}
					</dd>
				</div>
				<div>
					<dt>{{ t('nextcloud-vue', 'Indexes on them') }}</dt>
					<dd data-testid="cn-search-index-indexes">
						{{ status.indexCount }}
					</dd>
				</div>
				<div>
					<dt>{{ t('nextcloud-vue', 'Last run') }}</dt>
					<dd data-testid="cn-search-index-last-run">
						{{ lastRun }}
					</dd>
				</div>
				<div>
					<dt>{{ t('nextcloud-vue', 'Rebuild without locking') }}</dt>
					<dd data-testid="cn-search-index-concurrent">
						{{ concurrent }}
					</dd>
				</div>
			</dl>
			<p data-testid="cn-search-index-commands">
				{{ t('nextcloud-vue', 'Run {command} status on the server for the same figures, and {command} rebuild --apply after a schema change.', { command }) }}
			</p>
		</template>
	</div>
</template>

<script>
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { fetchSearchIndexStatus, SEARCH_INDEX_COMMAND, SEARCH_INDEX_STATUS_URL } from './searchIndexStatus.js'

/**
 * CnSearchIndexStatus: the state of OpenRegister's search indexes (tables in
 * scope, indexes on them, the last maintenance run, whether a rebuild locks a
 * table), read live and never copied. The acts are named, not offered: a
 * rebuild walks every table in scope and nothing stops one from a settings
 * page, so the occ verbs are printed for somebody with a shell.
 *
 * @spec openspec/changes/search-index-status/specs/search-index-status/spec.md
 */
export default {
	name: 'CnSearchIndexStatus',

	components: { NcLoadingIcon, NcNoteCard },

	props: {
		/** The app path OpenRegister reports its indexes at. */
		source: { type: String, default: SEARCH_INDEX_STATUS_URL },
		/** The occ command that acts on the indexes. */
		command: { type: String, default: SEARCH_INDEX_COMMAND },
	},

	data() {
		return {
			loading: true,
			error: '',
			status: { concurrentRebuildSupported: false, tables: {}, tableCount: 0, indexCount: 0, lastRun: null },
		}
	},

	computed: {
		/** @return {string} When maintenance last ran, or that it never has. */
		lastRun() {
			if (!this.status.lastRun) {
				return t('nextcloud-vue', 'Never')
			}
			const when = new Date(this.status.lastRun)
			if (Number.isNaN(when.getTime())) {
				return String(this.status.lastRun)
			}
			return when.toLocaleString(getCanonicalLocale(), { dateStyle: 'medium', timeStyle: 'short' })
		},

		/** @return {string} Whether a rebuild locks the table, in words. */
		concurrent() {
			return this.status.concurrentRebuildSupported === true
				? t('nextcloud-vue', 'Yes')
				: t('nextcloud-vue', 'No, a rebuild locks the table it is on')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Read what OpenRegister says about its indexes.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				this.status = await fetchSearchIndexStatus(this.source)
			} catch (e) {
				this.error = String((e && e.message) || e)
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
/* Label above value, and the label wraps: Nextcloud's settings stylesheet gives a `dt` a fixed width. */
.cn-search-index-status__figures {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 16px 24px;
	margin-block: 0 12px;
}

.cn-search-index-status__figures > div {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-search-index-status__figures dt {
	display: block;
	float: none;
	width: auto;
	margin: 0;
	padding: 0;
	text-align: start;
	white-space: normal;
	overflow-wrap: anywhere;
	color: var(--color-text-maxcontrast);
}

.cn-search-index-status__figures dd {
	font-weight: bold;
	margin: 0;
	overflow-wrap: anywhere;
}
</style>
