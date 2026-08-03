<!--
  CnObjectAccessTab — manage one object's ACCESS: its scope, and who is granted it.

  This is the UI for OpenRegister's per-object grant primitive
  (object-level-sharing-and-private-scope). It is NOT the same thing as
  `CnShareCreate`, and the difference matters:

    - CnShareCreate mints a share on a FILE inside the object's folder. That
      is the `shares` integration leaf — attaching a document to an object.
    - This tab grants access to the OBJECT, which is a share on the object's
      FOLDER. OpenRegister deliberately does NOT treat a file share as an
      object grant (task 4.7), so the two never overlap: attaching a document
      and sharing it must not hand over the object's data.

  Endpoints, all owner-or-admin on the server side:
    GET    {apiBase}/objects/{register}/{schema}/{id}/scope
    PUT    {apiBase}/objects/{register}/{schema}/{id}/scope        { scope }
    GET    {apiBase}/objects/{register}/{schema}/{id}/shares
    POST   {apiBase}/objects/{register}/{schema}/{id}/shares       { type, shareWith, permissions }
    DELETE {apiBase}/objects/{register}/{schema}/{id}/shares/{shareId}
    POST   {apiBase}/objects/{register}/{schema}/{id}/links        { password?, expiration? }
    POST   {apiBase}/objects/{register}/{schema}/{id}/invitations  { email, password?, expiration? }

  TWO DELIBERATE ABSENCES, both because the server would ignore the input:

  1. There is no "can re-share" control. OpenRegister strips core's
     PERMISSION_SHARE bit from every object grant (task 4.4) — a grant is a
     share on the object's FOLDER, so leaving that bit set would let the
     recipient pass the object on through core's Files UI, producing a valid
     object grant created by somebody never allowed to create one. Offering a
     checkbox that is silently cleared would be worse than not offering it.

  2. Revoking is immediate and needs no confirmation-of-propagation copy. The
     grant resolver reads through core's shares at decision time and memoises
     for one request only (task 4.6), so the next request already denies.

  A 403 renders the read-only view rather than an error: a non-owner may
  legitimately be able to SEE an object without being allowed to manage its
  sharing, and that is not a failure.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<div class="cn-sidebar-tab cn-object-access-tab">
		<div v-if="degraded" class="cn-object-access-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />

		<template v-else>
			<!-- Scope. The one control that changes who can reach the object
			     WITHOUT naming anybody, so it leads. -->
			<section class="cn-object-access-tab__section">
				<h4 class="cn-object-access-tab__heading">
					{{ scopeHeadingLabel }}
				</h4>
				<NcCheckboxRadioSwitch
					:model-value="isPrivate"
					:disabled="readOnly || savingScope"
					type="switch"
					@update:model-value="onScopeToggle">
					{{ privateLabel }}
				</NcCheckboxRadioSwitch>
				<p class="cn-object-access-tab__hint">
					{{ isPrivate ? privateHintLabel : organisationHintLabel }}
				</p>
			</section>

			<!-- Existing grants. -->
			<section class="cn-object-access-tab__section">
				<h4 class="cn-object-access-tab__heading">
					{{ grantsHeadingLabel }}
				</h4>

				<!-- The file coupling, said out loud (task 5.9). A grant IS a
				     share on the object's folder, so everything in that folder
				     travels with it. Leaving this implicit made the control
				     look narrower than it is: somebody granting read on an
				     object has no way to guess from this panel that the
				     attachments went too. -->
				<p class="cn-object-access-tab__hint">
					{{ fileCouplingLabel }}
				</p>

				<div v-if="error" class="cn-object-access-tab__error" role="alert">
					{{ error }}
				</div>

				<p v-else-if="grants.length === 0" class="cn-sidebar-tab__empty">
					{{ emptyLabel }}
				</p>

				<ul v-else class="cn-object-access-tab__list">
					<li v-for="grant in grants" :key="grant.id" class="cn-object-access-tab__row">
						<component :is="iconFor(grant.type)" :size="20" class="cn-object-access-tab__icon" />
						<div class="cn-object-access-tab__row-main">
							<span class="cn-object-access-tab__principal">{{ principalOf(grant) }}</span>
							<span class="cn-object-access-tab__meta">{{ describe(grant) }}</span>
						</div>
						<NcButton
							v-if="!readOnly"
							:aria-label="revokeLabel"
							:title="revokeLabel"
							:disabled="revokingId === grant.id"
							variant="tertiary"
							@click="revoke(grant)">
							<template #icon>
								<Close :size="20" />
							</template>
						</NcButton>
					</li>
				</ul>
			</section>

			<!-- Add a grant. -->
			<section v-if="!readOnly" class="cn-object-access-tab__section">
				<h4 class="cn-object-access-tab__heading">
					{{ addHeadingLabel }}
				</h4>

				<NcSelect
					v-model="newType"
					:options="typeOptions"
					:clearable="false"
					:aria-label="typeLabel"
					label="label"
					track-by="value" />

				<NcTextField
					v-if="needsPrincipal"
					v-model="newPrincipal"
					:label="principalLabelFor"
					:placeholder="principalLabelFor" />

				<NcCheckboxRadioSwitch
					v-if="newTypeValue !== 'link'"
					:model-value="allowEditing"
					type="checkbox"
					@update:model-value="allowEditing = $event">
					{{ allowEditingLabel }}
				</NcCheckboxRadioSwitch>

				<NcButton
					:disabled="submitting || !canSubmit"
					variant="primary"
					@click="submit">
					{{ addLabel }}
				</NcButton>

				<p v-if="lastLink" class="cn-object-access-tab__link">
					<code>{{ lastLink }}</code>
				</p>
			</section>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcSelect, NcTextField } from '@nextcloud/vue'
import Account from 'vue-material-design-icons/Account.vue'
import AccountGroup from 'vue-material-design-icons/AccountGroup.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Email from 'vue-material-design-icons/Email.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import { buildHeaders } from '../../utils/index.js'
// prefixUrl lives in headers.js and is NOT re-exported by the utils barrel;
// src/utils/visibleWhen.js imports it the same way.
import { prefixUrl } from '../../utils/headers.js'

/** Core permission bits. PERMISSION_SHARE (16) is deliberately never sent. */
const PERMISSION_READ = 1
const PERMISSION_UPDATE = 2

export default {
	name: 'CnObjectAccessTab',

	components: {
		Account,
		AccountGroup,
		AlertCircleOutline,
		Close,
		Email,
		LinkVariant,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcSelect,
		NcTextField,
	},

	props: {
		/** Object uuid. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'Not shared with anyone yet') },
	},

	emits: ['granted', 'revoked', 'scope-changed'],

	data() {
		return {
			loading: false,
			submitting: false,
			savingScope: false,
			error: '',
			degraded: '',
			/** True when the caller may see the object but not manage its sharing. */
			readOnly: false,
			scope: 'organisation',
			grants: [],
			newType: null,
			newPrincipal: '',
			allowEditing: false,
			revokingId: null,
			lastLink: '',
		}
	},

	computed: {
		isPrivate() {
			return this.scope === 'private'
		},

		newTypeValue() {
			return (this.newType?.value ?? 'user')
		},

		needsPrincipal() {
			return this.newTypeValue !== 'link'
		},

		canSubmit() {
			if (this.needsPrincipal === false) {
				return true
			}

			return this.newPrincipal.trim() !== ''
		},

		typeOptions() {
			return [
				{ value: 'user', label: t('nextcloud-vue', 'User') },
				{ value: 'group', label: t('nextcloud-vue', 'Group') },
				{ value: 'email', label: t('nextcloud-vue', 'Email') },
				{ value: 'link', label: t('nextcloud-vue', 'Public link') },
			]
		},

		principalLabelFor() {
			if (this.newTypeValue === 'group') {
				return t('nextcloud-vue', 'Group name')
			}

			if (this.newTypeValue === 'email') {
				return t('nextcloud-vue', 'Email address')
			}

			return t('nextcloud-vue', 'Username')
		},

		base() {
			return `${this.apiBase}/objects/${encodeURIComponent(this.register)}`
				+ `/${encodeURIComponent(this.schema)}/${encodeURIComponent(this.objectId)}`
		},

		scopeHeadingLabel() {
			return t('nextcloud-vue', 'Visibility')
		},

		privateLabel() {
			return t('nextcloud-vue', 'Private')
		},

		privateHintLabel() {
			return t('nextcloud-vue', 'Only you, administrators, and the people below can reach this.')
		},

		organisationHintLabel() {
			return t('nextcloud-vue', 'Anyone in your organisation who may read this type can reach it.')
		},

		grantsHeadingLabel() {
			return t('nextcloud-vue', 'Shared with')
		},

		fileCouplingLabel() {
			return t('nextcloud-vue', 'Everyone listed here can also open the files attached to this item.')
		},

		addHeadingLabel() {
			return t('nextcloud-vue', 'Add access')
		},

		addLabel() {
			return t('nextcloud-vue', 'Share')
		},

		typeLabel() {
			return t('nextcloud-vue', 'Share type')
		},

		allowEditingLabel() {
			return t('nextcloud-vue', 'Allow editing')
		},

		revokeLabel() {
			return t('nextcloud-vue', 'Revoke access')
		},
	},

	watch: {
		objectId: 'reload',
		register: 'reload',
		schema: 'reload',
	},

	mounted() {
		this.newType = this.typeOptions[0]
		this.reload()
	},

	methods: {
		t,

		/**
		 * Icon per grant type.
		 *
		 * Every name returned here is imported and registered in `components`
		 * above. An unregistered component name renders NOTHING at all in Vue —
		 * not a fallback, not a warning in production (ADR-077).
		 *
		 * @param {string} type The grant type as the API reports it.
		 * @return {string} A registered component name.
		 */
		iconFor(type) {
			if (type === 'group' || type === 'remote_group') {
				return 'AccountGroup'
			}

			if (type === 'email') {
				return 'Email'
			}

			if (type === 'link') {
				return 'LinkVariant'
			}

			return 'Account'
		},

		principalOf(grant) {
			if (grant.sharedWith) {
				return grant.sharedWith
			}

			if (grant.type === 'link') {
				return t('nextcloud-vue', 'Anyone with the link')
			}

			return t('nextcloud-vue', 'Unknown')
		},

		/**
		 * A one-line summary of what the grant permits.
		 *
		 * Only read and update are distinguished. The re-share bit is never set
		 * on an object grant (see the file header), so it is never described.
		 *
		 * @param {object} grant One entry from the grants list.
		 * @return {string} A short, translated description.
		 */
		describe(grant) {
			const permissions = Number(grant.permissions ?? 0)
			const canEdit = (permissions & PERMISSION_UPDATE) === PERMISSION_UPDATE

			const what = canEdit
				? t('nextcloud-vue', 'Can edit')
				: t('nextcloud-vue', 'Can view')

			if (Array.isArray(grant.verbs) && grant.verbs.length > 0) {
				return `${what} · ${grant.verbs.join(', ')}`
			}

			return what
		},

		async reload() {
			this.loading = true
			this.error = ''
			this.degraded = ''
			this.readOnly = false

			try {
				const [scopeRes, sharesRes] = await Promise.all([
					fetch(prefixUrl(`${this.base}/scope`), { headers: buildHeaders() }),
					fetch(prefixUrl(`${this.base}/shares`), { headers: buildHeaders() }),
				])

				// 403 is not an error here: the caller can see the object but is
				// not its owner, so the tab renders read-only rather than broken.
				if (scopeRes.status === 403 || sharesRes.status === 403) {
					this.readOnly = true
				}

				if (scopeRes.ok) {
					this.scope = ((await scopeRes.json()).scope ?? 'organisation')
				}

				if (sharesRes.ok) {
					this.grants = ((await sharesRes.json()).results ?? [])
				} else if (this.readOnly === false) {
					this.degraded = t('nextcloud-vue', 'Sharing is currently unavailable for this item.')
				}
			} catch (e) {
				this.error = t('nextcloud-vue', 'Could not load sharing information.')
			} finally {
				this.loading = false
			}
		},

		async onScopeToggle(next) {
			this.savingScope = true
			const previous = this.scope
			const scope = next ? 'private' : 'organisation'

			try {
				const res = await fetch(prefixUrl(`${this.base}/scope`), {
					method: 'PUT',
					headers: buildHeaders(),
					body: JSON.stringify({ scope }),
				})

				if (!res.ok) {
					throw new Error(String(res.status))
				}

				this.scope = scope
				/**
				 * @event scope-changed Emitted after the visibility scope is PERSISTED — never on the optimistic toggle, since a refused change reverts the switch and emits nothing.
				 * @type {string} `'private'` or `'organisation'`.
				 */
				this.$emit('scope-changed', scope)
			} catch (e) {
				// Revert the switch rather than leaving the UI asserting a change
				// the server refused.
				this.scope = previous
				this.error = t('nextcloud-vue', 'Could not change the visibility.')
			} finally {
				this.savingScope = false
			}
		},

		async submit() {
			this.submitting = true
			this.error = ''
			this.lastLink = ''

			// PERMISSION_SHARE is never included — see the file header.
			const permissions = this.allowEditing
				? (PERMISSION_READ | PERMISSION_UPDATE)
				: PERMISSION_READ

			try {
				const type = this.newTypeValue
				let res

				if (type === 'link') {
					res = await this.post(`${this.base}/links`, {})
				} else if (type === 'email') {
					res = await this.post(`${this.base}/invitations`, { email: this.newPrincipal.trim() })
				} else {
					// `type` carries the STRING label, not core's numeric share
					// type. ObjectSharingController::createShare() reads
					// `getParam('type')` and defaults it to 'user', and
					// ObjectSharingService::grant() validates it against
					// GRANTABLE_TYPES ('user', 'group', 'remote',
					// 'remote_group') before mapping it to IShare::TYPE_*.
					//
					// This used to send `shareType: 0 | 1`. The server never
					// reads that key, so it fell through to the 'user' default:
					// picking "Group" created a USER grant to a uid that
					// happened to be spelled like the group. User grants
					// worked by coincidence, which is why nothing caught it.
					res = await this.post(`${this.base}/shares`, {
						type,
						shareWith: this.newPrincipal.trim(),
						permissions,
					})
				}

				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					this.error = (body.message || t('nextcloud-vue', 'Could not share this item.'))
					return
				}

				const created = await res.json()
				if (created.token) {
					this.lastLink = created.token
				}

				this.newPrincipal = ''
				/**
				 * @event granted Emitted after a grant is created — a user, group, email invitation or public link.
				 * @type {object} The created grant as the server returned it; a link carries its `token`.
				 */
				this.$emit('granted', created)
				await this.reload()
			} catch (e) {
				this.error = t('nextcloud-vue', 'Could not share this item.')
			} finally {
				this.submitting = false
			}
		},

		post(url, body) {
			return fetch(prefixUrl(url), {
				method: 'POST',
				headers: buildHeaders(),
				body: JSON.stringify(body),
			})
		},

		async revoke(grant) {
			this.revokingId = grant.id
			this.error = ''

			try {
				const res = await fetch(
					prefixUrl(`${this.base}/shares/${encodeURIComponent(grant.id)}`),
					{ method: 'DELETE', headers: buildHeaders() },
				)

				if (!res.ok) {
					throw new Error(String(res.status))
				}

				/**
				 * @event revoked Emitted after a grant is revoked. Effective on the next request — the resolver memoises for one request only — so no propagation delay is implied.
				 * @type {object} The grant that was removed.
				 */
				this.$emit('revoked', grant)
				await this.reload()
			} catch (e) {
				this.error = t('nextcloud-vue', 'Could not revoke access.')
			} finally {
				this.revokingId = null
			}
		},
	},
}
</script>

<style scoped>
.cn-object-access-tab {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.cn-object-access-tab__section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.cn-object-access-tab__heading {
	margin: 0;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-object-access-tab__hint,
.cn-object-access-tab__meta {
	color: var(--color-text-maxcontrast);
	font-size: 0.85rem;
	margin: 0;
}

.cn-object-access-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-object-access-tab__row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.25rem 0;
}

.cn-object-access-tab__row-main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.cn-object-access-tab__principal {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-object-access-tab__banner,
.cn-object-access-tab__error {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--color-error);
}

.cn-object-access-tab__link code {
	word-break: break-all;
}
</style>
