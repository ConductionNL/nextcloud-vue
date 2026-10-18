<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-exports-widget" data-testid="cn-exports-widget">
		<p v-if="loading && runs.length === 0" class="cn-exports-widget__muted">
			{{ t('nextcloud-vue', 'Loading …') }}
		</p>
		<p v-else-if="failed" class="cn-exports-widget__muted" data-testid="cn-exports-error">
			{{ t('nextcloud-vue', 'Your exports could not be loaded.') }}
		</p>
		<p v-else-if="runs.length === 0" class="cn-exports-widget__muted" data-testid="cn-exports-empty">
			{{ emptyText }}
		</p>
		<ul v-else class="cn-exports-widget__list">
			<li v-for="run in shownRuns"
				:key="run.key"
				class="cn-exports-widget__row"
				data-testid="cn-exports-row">
				<span class="cn-exports-widget__text">
					<span class="cn-exports-widget__name">{{ run.filename }}</span>
					<span class="cn-exports-widget__meta">{{ run.meta }}</span>
				</span>
				<span v-if="run.expiresToday" class="cn-exports-widget__tag" data-testid="cn-exports-expires-today">
					{{ t('nextcloud-vue', 'Expires today') }}
				</span>
				<NcButton v-else-if="run.href"
					:href="run.href"
					data-testid="cn-exports-download">
					{{ t('nextcloud-vue', 'Download') }}
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateRemoteUrl, generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import { formatBoardDate } from '../../utils/boardDate.js'

/**
 * CnExportsWidget — the reader's own exports (DqZoekresultaten "Uw exports"):
 * each file with when it was made, how often it was downloaded and when it
 * expires, a Download button while the file is there, and "Expires today" on
 * the day it goes.
 *
 * Reads OpenRegister's export runs (`GET /apps/openregister/api/exports`)
 * with the reader as the actor, so an administrator sees their own here too.
 * `content.register` and `content.schema` narrow it to one list's exports.
 * A run whose file was swept, or that never produced one, is left out.
 *
 * Example (manifest, in an index page's `sidePanel`):
 * ```json
 * { "id": "exports", "type": "exports", "title": "Your exports", "content": { "register": "dossiq", "schema": "case", "limit": 5 } }
 * ```
 */
export default {
	name: 'CnExportsWidget',

	components: { NcButton },

	inject: {
		/** Host translate function provided by CnAppRoot. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** `{ register?, schema?, limit?, emptyText? }`; `limit` defaults to 5. */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return { loading: false, failed: false, runs: [], now: new Date() }
	},

	computed: {
		/** @return {number} How many exports to show. */
		limit() {
			const limit = Number(this.content && this.content.limit)
			return Number.isInteger(limit) && limit > 0 ? limit : 5
		},

		/** @return {Array<object>} The exports to draw, newest first. */
		shownRuns() {
			return this.runs
				.filter((run) => run && run.filename && run.fileId !== null && run.fileId !== undefined && run.status !== 'expired')
				.slice(0, this.limit)
				.map((run) => this.view(run))
		},

		/** @return {string} The empty line. */
		emptyText() {
			const own = this.content && this.content.emptyText
			return own ? this.cnTranslate(own) : t('nextcloud-vue', 'You have no exports here.')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Read the reader's export runs.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const user = getCurrentUser()
			if (!user || !user.uid) {
				return
			}
			this.loading = true
			this.failed = false
			try {
				const params = { actor: user.uid, limit: Math.max(this.limit * 2, 10) }
				for (const key of ['register', 'schema']) {
					if (this.content && typeof this.content[key] === 'string' && this.content[key] !== '') {
						params[key] = this.content[key]
					}
				}
				const response = await axios.get(generateUrl('/apps/openregister/api/exports'), { params })
				const results = response && response.data && Array.isArray(response.data.results) ? response.data.results : []
				this.runs = [...results].sort((a, b) => String(b.producedAt || b.created || '').localeCompare(String(a.producedAt || a.created || '')))
			} catch {
				this.failed = true
				this.runs = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * One export as the list draws it.
		 *
		 * @param {object} run An export run.
		 * @return {{key: string, filename: string, meta: string, href: string, expiresToday: boolean}}
		 */
		view(run) {
			const made = run.producedAt || run.created
			const parts = []
			if (made) {
				parts.push(t('nextcloud-vue', 'Made {date}', { date: formatBoardDate(made, this.now) }))
			}
			if (typeof run.downloadCount === 'number') {
				parts.push(n('nextcloud-vue', 'downloaded %n time', 'downloaded %n times', run.downloadCount))
			}
			if (run.expiresAt) {
				parts.push(t('nextcloud-vue', 'expires {date}', { date: formatBoardDate(run.expiresAt, this.now) }))
			}
			const user = getCurrentUser()
			const href = run.filePath && user && user.uid
				? generateRemoteUrl(`dav/files/${encodeURIComponent(user.uid)}`) + String(run.filePath).split('/').map(encodeURIComponent).join('/')
				: ''
			return {
				key: String(run.uuid || run.id),
				filename: run.filename,
				meta: parts.join(' · '),
				href,
				expiresToday: Boolean(run.expiresAt) && new Date(run.expiresAt).toDateString() === this.now.toDateString(),
			}
		},
	},
}
</script>

<style scoped>
.cn-exports-widget__list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-exports-widget__row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 0;
}

.cn-exports-widget__row + .cn-exports-widget__row {
	border-top: 1px solid var(--color-border);
}

.cn-exports-widget__text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-exports-widget__name {
	overflow: hidden;
	font-size: 14px;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-exports-widget__meta,
.cn-exports-widget__muted {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-exports-widget__muted {
	margin: 0;
}

.cn-exports-widget__tag {
	flex: none;
	padding: 3px 10px;
	border-radius: 12px;
	background: var(--color-warning-light, color-mix(in srgb, var(--color-warning) 18%, transparent));
	color: var(--color-warning-text, var(--color-main-text));
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
}
</style>
