<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2

  The packages an app ships, drawn by CnStorePage under the board look while no
  registry is configured (board DqMarktplaats). The list and every install go
  through the app's own routes; the install button is presentation only, the
  route enforces who may install.
-->
<template>
	<div class="cn-store-packages" data-testid="store-packages">
		<nav v-if="crumbs.length > 0" class="cn-store-packages__crumbs" :aria-label="breadcrumbLabel">
			<template v-for="(crumb, index) in crumbs" :key="crumb.label">
				<a v-if="crumb.href" :href="crumb.href">{{ tr(crumb.label) }}</a>
				<span v-else aria-current="page">{{ tr(crumb.label) }}</span>
				<span v-if="index < crumbs.length - 1" aria-hidden="true">/</span>
			</template>
		</nav>

		<div v-if="config.notice"
			class="cn-store-packages__notice"
			role="status"
			data-testid="store-packages-notice">
			<InformationOutline :size="18" />
			<span><strong>{{ tr(config.notice.title) }}</strong> {{ tr(config.notice.text) }}</span>
		</div>

		<div class="cn-store-packages__layout">
			<section class="cn-store-packages__main">
				<div class="cn-store-packages__head">
					<div class="cn-store-packages__heading">
						<h2>{{ tr(config.title) }}</h2>
						<span v-if="config.subtitle">{{ tr(config.subtitle) }}</span>
					</div>
					<span data-testid="store-packages-count">{{ countLine }}</span>
				</div>

				<NcLoadingIcon v-if="loading" :size="32" />
				<NcNoteCard v-else-if="failed" type="warning" data-testid="store-packages-failed">
					{{ failedText }}
				</NcNoteCard>
				<ul v-else class="cn-store-packages__grid">
					<li v-for="item in packages"
						:key="item.id"
						class="cn-store-packages__card"
						data-testid="store-package">
						<div class="cn-store-packages__card-head">
							<div class="cn-store-packages__heading">
								<h3>{{ tr(item.title) }}</h3>
								<span>{{ versionLine(item) }}</span>
							</div>
							<span class="cn-store-packages__pill">{{ packageLabel }}</span>
						</div>
						<p>{{ tr(item.summary) }}</p>
						<div class="cn-store-packages__card-foot">
							<span>{{ tr(config.parts || '') }}</span>
							<span v-if="item.installed"
								class="cn-store-packages__pill cn-store-packages__pill--done"
								data-testid="store-package-installed">{{ installedLabel }}</span>
							<NcButton v-else-if="canInstall && item.onRequest"
								variant="primary"
								:disabled="installing === item.id"
								:aria-label="`${installLabel} ${tr(item.title)}`"
								data-testid="store-package-install"
								@click="install(item)">
								{{ installLabel }}
							</NcButton>
						</div>
					</li>
				</ul>
			</section>

			<aside class="cn-store-packages__aside">
				<section v-for="card in asideCards"
					:key="card.title"
					class="cn-store-packages__side"
					data-testid="store-packages-aside">
					<h2>{{ tr(card.title) }}</h2>
					<dl v-if="card.rows">
						<div v-for="row in card.rows" :key="row.label">
							<dt>{{ tr(row.label) }}</dt>
							<dd :class="{ 'cn-store-packages__pill': row.pill }">
								{{ tr(row.value) }}
							</dd>
						</div>
					</dl>
					<p v-if="card.text">
						{{ tr(card.text) }}
					</p>
					<p v-if="card.note" class="cn-store-packages__note">
						{{ tr(card.note) }}
					</p>
					<a v-if="card.link" :href="card.link.href">{{ tr(card.link.label) }}</a>
				</section>
			</aside>
		</div>
	</div>
</template>

<script>
import { showError, showSuccess } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'

export default {
	name: 'CnStorePackages',

	components: { InformationOutline, NcButton, NcLoadingIcon, NcNoteCard },

	props: {
		/** The app id, for its `/api/store/packages` routes. */
		app: { type: String, required: true },
		/** `config.shipped`: `{ title, subtitle, parts, notice, crumbs, aside }`. */
		config: { type: Object, required: true },
		/** Whether the install button shows. The route decides who may install. */
		canInstall: { type: Boolean, default: false },
		/** The app's translate function. */
		tr: { type: Function, default: (key) => key },
	},

	data() {
		return { packages: [], loading: true, failed: false, installing: '' }
	},

	computed: {
		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		crumbs() {
			return Array.isArray(this.config.crumbs) ? this.config.crumbs : []
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		asideCards() {
			return Array.isArray(this.config.aside) ? this.config.aside : []
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		countLine() {
			const installed = this.packages.filter((item) => item.installed).length
			return t('nextcloud-vue', '{count} packages · {installed} installed', { count: this.packages.length, installed })
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		breadcrumbLabel() {
			return t('nextcloud-vue', 'Breadcrumb')
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		packageLabel() {
			return t('nextcloud-vue', 'Package')
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		installedLabel() {
			return t('nextcloud-vue', 'Installed')
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		installLabel() {
			return t('nextcloud-vue', 'Install')
		},

		/** @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages */
		failedText() {
			return t('nextcloud-vue', 'The packages could not be read.')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		/**
		 * Read the shipped packages.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 */
		async load() {
			this.loading = true
			this.failed = false
			try {
				const response = await fetch(generateUrl(`/apps/${this.app}/api/store/packages`), {
					headers: { requesttoken: window.OC?.requestToken },
				})
				if (response.ok !== true) {
					throw new Error(String(response.status))
				}
				this.packages = (await response.json()).packages ?? []
			} catch {
				this.failed = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * The version line of a package.
		 *
		 * @param {object} item The package.
		 * @return {string} The line.
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 */
		versionLine(item) {
			return t('nextcloud-vue', 'Version {version} · shipped with {app}', { version: item.version, app: this.app })
		},

		/**
		 * Install a package and read the list back.
		 *
		 * @param {object} item The package.
		 * @return {Promise<void>}
		 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md#requirement-without-a-registry-the-board-store-lists-the-shipped-packages
		 */
		async install(item) {
			this.installing = item.id
			try {
				const response = await fetch(
					generateUrl(`/apps/${this.app}/api/store/packages/${encodeURIComponent(item.id)}/install`),
					{ method: 'POST', headers: { requesttoken: window.OC?.requestToken } },
				)
				const body = await response.json()
				if (response.ok !== true || body.success !== true) {
					showError(body.message || t('nextcloud-vue', 'The item could not be installed.'))
					return
				}
				showSuccess(t('nextcloud-vue', 'Installed.'))
				await this.load()
			} catch {
				showError(t('nextcloud-vue', 'The item could not be installed.'))
			} finally {
				this.installing = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-store-packages {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.cn-store-packages__crumbs {
	display: flex;
	gap: 8px;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-store-packages__crumbs a,
.cn-store-packages__side a {
	color: var(--color-primary-element);
	font-size: 14px;
	text-decoration: underline;
}

.cn-store-packages__notice {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 16px;
	border-radius: 10px;
	background: var(--cn-board-notice-info-ground, var(--color-primary-element-light));
	color: var(--cn-board-primary-light-ink, var(--color-primary-element-light-text));
	font-size: 14px;
	line-height: 1.5;
}

.cn-store-packages__layout {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 20px;
}

.cn-store-packages__main {
	display: flex;
	flex: 999 1 560px;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.cn-store-packages__head,
.cn-store-packages__card-head,
.cn-store-packages__card-foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}

.cn-store-packages__card-head {
	align-items: flex-start;
}

.cn-store-packages__card-foot {
	margin-top: auto;
	font-size: 13px;
}

.cn-store-packages__heading {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-store-packages h2,
.cn-store-packages h3 {
	margin: 0;
	color: var(--color-main-text);
	font-size: 17px;
	font-weight: 700;
}

.cn-store-packages__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 16px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-store-packages__card,
.cn-store-packages__side {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 18px 20px;
	border: 1px solid var(--color-border);
	border-radius: 12px;
	background: var(--color-main-background);
}

.cn-store-packages__card p,
.cn-store-packages__side p {
	margin: 0;
	font-size: 14px;
	line-height: 1.5;
}

.cn-store-packages__pill {
	padding: 3px 10px;
	border-radius: 12px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 13px;
	font-weight: 600;
}

.cn-store-packages__pill--done {
	background: var(--color-success-light, var(--color-background-dark));
	color: var(--color-success-text);
}

.cn-store-packages__aside {
	display: flex;
	flex: 1 1 300px;
	flex-direction: column;
	gap: 16px;
	max-width: 360px;
}

.cn-store-packages__side dl {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	font-size: 14px;
}

.cn-store-packages__side dl > div {
	display: flex;
	justify-content: space-between;
	gap: 12px;
}

.cn-store-packages__side dt,
.cn-store-packages__side dd:not(.cn-store-packages__pill) {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-store-packages__side p.cn-store-packages__note {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}
</style>
