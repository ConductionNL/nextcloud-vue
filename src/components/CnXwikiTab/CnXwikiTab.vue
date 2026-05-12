<!--
  CnXwikiTab — sidebar tab for the XWiki ("Articles") integration.

  Lists the XWiki pages linked to an OpenRegister object, each with its
  full breadcrumb so same-titled pages in different spaces are
  distinguishable (AD-3). Pages are linked by pasting a full XWiki URL
  (parsed server-side to a canonical `Space.Page` reference) or by
  typing the path directly (AD-2). Unlink removes the pairing only —
  it never deletes the page in XWiki.

  External integration: all CRUD goes through OpenRegister's
  pluggable-integration sub-resource
  `/api/objects/{register}/{schema}/{id}/integrations/xwiki`
  (`ObjectIntegrationsController`), which dispatches to the PHP
  `XwikiProvider`, which in turn delegates to the OpenConnector `xwiki`
  source. If the source's credentials have expired the endpoint
  answers 503 with a `reason` — the tab then shows a reconnect banner
  instead of a broken list (AD-23).

  Registered on the pluggable integration registry as `xwiki` (see
  src/integrations/builtin/xwiki.js).
-->
<template>
	<div class="cn-sidebar-tab cn-xwiki-tab">
		<!-- Auth / availability banner -->
		<div v-if="authBanner" class="cn-xwiki-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ authBanner }}</span>
		</div>

		<!-- Link form -->
		<form class="cn-xwiki-tab__link-form" @submit.prevent="submitLink">
			<NcTextField
				:value.sync="linkInput"
				:label="linkPlaceholder"
				:placeholder="linkPlaceholder"
				:disabled="linking" />
			<NcButton
				type="primary"
				native-type="submit"
				:disabled="!linkInput.trim() || linking">
				<template #icon>
					<LinkVariant :size="20" />
				</template>
				{{ linkLabel }}
			</NcButton>
		</form>
		<p v-if="linkError" class="cn-xwiki-tab__error">
			{{ linkError }}
		</p>

		<!-- Pages list -->
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-xwiki-tab__error">
			{{ error }}
		</div>
		<div v-else-if="pages.length === 0" class="cn-sidebar-tab__empty">
			{{ noPagesLabel }}
		</div>
		<ul v-else class="cn-xwiki-tab__list">
			<li v-for="page in pages" :key="page.id" class="cn-xwiki-tab__row">
				<FileDocumentOutline :size="20" class="cn-xwiki-tab__icon" />
				<div class="cn-xwiki-tab__row-main">
					<a
						v-if="page.url"
						:href="page.url"
						target="_blank"
						rel="noopener"
						class="cn-xwiki-tab__title">
						{{ page.title }}
					</a>
					<span v-else class="cn-xwiki-tab__title">{{ page.title }}</span>
					<span v-if="breadcrumbText(page)" class="cn-xwiki-tab__breadcrumb">{{ breadcrumbText(page) }}</span>
				</div>
				<NcButton
					type="tertiary-no-background"
					:aria-label="unlinkLabel"
					:disabled="unlinkingId === page.id"
					@click="unlink(page)">
					<template #icon>
						<LinkVariantOff :size="18" />
					</template>
				</NcButton>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnXwikiTab — XWiki "Articles" sidebar tab for the pluggable
 * integration registry.
 *
 * Basic usage (via CnObjectSidebar registry mode — you don't mount it
 * directly):
 * ```vue
 * OCA.OpenRegister.integrations.register({ id: 'xwiki', tab: CnXwikiTab, ... })
 * ```
 */
export default {
	name: 'CnXwikiTab',

	components: { NcButton, NcTextField, NcLoadingIcon, AlertCircleOutline, FileDocumentOutline, LinkVariant, LinkVariantOff },

	props: {
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated placeholder/label for the link input. */
		linkPlaceholder: { type: String, default: () => t('nextcloud-vue', 'Paste an XWiki page URL or type a Space.Page path') },
		/** Pre-translated label for the "Link page" button. */
		linkLabel: { type: String, default: () => t('nextcloud-vue', 'Link page') },
		/** Pre-translated aria-label for the per-row "Unlink page" button. */
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink page') },
		/** Pre-translated empty-state label when no pages are linked. */
		noPagesLabel: { type: String, default: () => t('nextcloud-vue', 'No linked articles') },
		/** Pre-translated banner shown when the OpenConnector source's credentials need re-connecting. */
		reconnectLabel: { type: String, default: () => t('nextcloud-vue', 'XWiki connection needs attention — re-connect it in OpenConnector.') },
		/** Pre-translated banner shown when XWiki / OpenConnector is unreachable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'XWiki is not reachable right now.') },
	},

	data() {
		return {
			pages: [],
			loading: false,
			error: '',
			authBanner: '',
			linkInput: '',
			linking: false,
			linkError: '',
			unlinkingId: null,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPages() } } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/xwiki`
		},

		breadcrumbText(page) {
			if (Array.isArray(page.breadcrumb) && page.breadcrumb.length > 1) {
				return page.breadcrumb.slice(0, -1).join(' / ')
			}
			return page.space || ''
		},

		async fetchPages() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.authBanner = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.pages = data.results || data || []
				} else if (response.status === 503) {
					this.pages = []
					this.authBanner = await this.degradedMessage(response)
				} else {
					this.pages = []
					this.error = t('nextcloud-vue', 'Could not load linked articles.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] failed to fetch linked pages', err)
				this.pages = []
				this.error = t('nextcloud-vue', 'Could not load linked articles.')
			} finally {
				this.loading = false
			}
		},

		async degradedMessage(response) {
			try {
				const body = await response.json()
				const reason = body?.details?.reason || body?.reason
				if (reason === 'openconnector-source-missing' || reason === 'provider-auth' || /auth/i.test(String(body?.message || ''))) {
					return this.reconnectLabel
				}
			} catch (e) {
				// fall through
			}
			return this.unavailableLabel
		},

		async submitLink() {
			const reference = this.linkInput.trim()
			if (!reference || this.linking) {
				return
			}
			this.linking = true
			this.linkError = ''
			try {
				const response = await fetch(this.baseUrl(), {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify({ reference }),
				})
				if (response.ok) {
					this.linkInput = ''
					await this.fetchPages()
					/** @event linked Emitted after a page is linked and the list refreshes. Payload: the reference (URL or `Space.Page` path) that was submitted. */
					this.$emit('linked', reference)
				} else if (response.status === 503) {
					this.linkError = await this.degradedMessage(response)
				} else {
					this.linkError = t('nextcloud-vue', 'Could not link that page — check the URL or path.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] failed to link page', err)
				this.linkError = t('nextcloud-vue', 'Could not link that page — check the URL or path.')
			} finally {
				this.linking = false
			}
		},

		async unlink(page) {
			if (this.unlinkingId) {
				return
			}
			this.unlinkingId = page.id
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(page.id)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					this.pages = this.pages.filter((p) => p.id !== page.id)
					/** @event unlinked Emitted after a page's pairing is removed (the page itself is NOT deleted in XWiki). Payload: the page reference id. */
					this.$emit('unlinked', page.id)
				} else if (response.status === 503) {
					this.authBanner = await this.degradedMessage(response)
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] failed to unlink page', err)
			} finally {
				this.unlinkingId = null
			}
		},
	},
}
</script>

<style scoped>
.cn-xwiki-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-xwiki-tab__link-form {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	margin-bottom: 8px;
}

.cn-xwiki-tab__link-form > :first-child {
	flex: 1;
}

.cn-xwiki-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-xwiki-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-xwiki-tab__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-xwiki-tab__row:last-child {
	border-bottom: none;
}

.cn-xwiki-tab__icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-xwiki-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-xwiki-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-xwiki-tab__title:hover {
	text-decoration: underline;
}

.cn-xwiki-tab__breadcrumb {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
