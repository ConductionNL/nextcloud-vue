<!--
  CnFlowPublishDialog — what publishing is about to be called, and what it takes
  away, shown BEFORE it happens.

  🔴 THE DERIVATION WAS ALREADY RIGHT AND ENTIRELY INVISIBLE. An author found
  out that a change was major by publishing it, and the first surprising major
  is the one that teaches them to ignore the number. A version nobody can
  predict is a version nobody reads.

  THE NUMBERS COME FROM THE SERVER, NOT FROM HERE. `GET …/version-preview`
  answers with the same comparison the publish itself will run. Working out
  "this looks breaking" in the client would be a second implementation of the
  rule, and the first time the two disagree the author learns to believe
  neither.

  WHY THE OVERRIDE IS ONE-WAY. The author may say a publish is major that the
  diff called minor — they know which values a consumer reads, and the diff does
  not. They may NOT say a removal is minor: the diff SAW the step disappear, and
  evidence is not something optimism can argue down. So this dialog offers a
  checkbox that only ever raises, and the server refuses the other direction
  even if something got past here.

  A FAILED PREVIEW DOES NOT BLOCK THE PUBLISH. It is a courtesy, not a gate: an
  instance whose route is older than this build would otherwise lose the ability
  to publish at all. The dialog says it could not work the number out and still
  offers the button.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog :name="t('nextcloud-vue', 'Publish this version')"
		size="normal"
		data-testid="flow-publish-dialog"
		@closing="$emit('close')">
		<div class="cn-flow-publish">
			<NcLoadingIcon v-if="store.previewingPublish" :size="32" />

			<template v-else-if="preview">
				<p class="cn-flow-publish__headline" data-testid="flow-publish-next">
					<template v-if="preview.first">
						{{ t('nextcloud-vue', 'This is the first version of this flow. It becomes {version}.', { version: preview.next }) }}
					</template>
					<template v-else>
						{{ t('nextcloud-vue', 'Version {current} becomes {next}.', { current: preview.current || '?', next: preview.next }) }}
					</template>
				</p>

				<p class="cn-flow-publish__verdict"
					:class="`cn-flow-publish__verdict--${preview.verdict}`"
					data-testid="flow-publish-verdict">
					<template v-if="preview.verdict === 'major'">
						{{ t('nextcloud-vue', 'This is a breaking change. It removes something another flow or app may rely on.') }}
					</template>
					<template v-else>
						{{ t('nextcloud-vue', 'This change removes nothing, so it stays compatible.') }}
					</template>
				</p>

				<!--
					NAMED, not counted. "This publish is major" without saying
					what went is the message an author learns to click past.
				-->
				<ul v-if="removals.length" class="cn-flow-publish__removals" data-testid="flow-publish-removals">
					<li v-for="removal in removals" :key="removal.key">
						<span class="cn-flow-publish__removal-kind">{{ removal.kind }}</span>
						<span class="cn-flow-publish__removal-name">{{ removal.name }}</span>
					</li>
				</ul>

				<NcCheckboxRadioSwitch v-if="preview.verdict !== 'major'"
					:model-value="forceMajor"
					data-testid="flow-publish-force-major"
					@update:model-value="forceMajor = $event">
					{{ t('nextcloud-vue', 'Publish as a breaking change anyway') }}
				</NcCheckboxRadioSwitch>
				<p v-if="preview.verdict !== 'major'" class="cn-flow-publish__note">
					{{ t('nextcloud-vue', 'Tick this if you changed a value something else reads. The comparison cannot see that. Only you can.') }}
				</p>
			</template>

			<p v-else class="cn-flow-publish__note" data-testid="flow-publish-unknown">
				{{ t('nextcloud-vue', 'The next version number could not be worked out. Publishing still works.') }}
			</p>

			<p v-if="store.versionBumpRefusal" class="cn-flow-publish__refusal" data-testid="flow-publish-refusal">
				{{ store.versionBumpRefusal }}
			</p>
		</div>

		<template #actions>
			<NcButton data-testid="flow-publish-cancel" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="primary"
				:disabled="store.transitioning"
				data-testid="flow-publish-confirm"
				@click="confirm">
				{{ t('nextcloud-vue', 'Publish') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon } from '@nextcloud/vue'
import { useFlowStore } from '../composables/useFlowStore.js'

export default {
	name: 'CnFlowPublishDialog',

	components: { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon },

	emits: ['close', 'published'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return {
			// Never sticky across openings: an author who ticked this for one
			// publish has not agreed to it for the next one.
			forceMajor: false,
		}
	},

	computed: {
		/**
		 * The server's answer, or null while it is being fetched or after it
		 * failed.
		 *
		 * @return {object|null} The preview.
		 */
		preview() {
			return this.store.publishPreview
		},

		/**
		 * What the publish takes away, as one list the author can read.
		 *
		 * Steps, connections and settings are separate losses to whoever
		 * depends on them — a rewiring that removes a path while keeping every
		 * node breaks a consumer without deleting anything visible — so each is
		 * labelled rather than merged into a count.
		 *
		 * @return {Array<object>} One entry per removed thing.
		 */
		removals() {
			const preview = this.preview
			if (!preview) {
				return []
			}

			const kinds = [
				{ field: 'removedNodes', label: this.t('nextcloud-vue', 'Step') },
				{ field: 'removedEdges', label: this.t('nextcloud-vue', 'Connection') },
				{ field: 'removedKeys', label: this.t('nextcloud-vue', 'Setting') },
			]

			return kinds.flatMap(({ field, label }) =>
				(preview[field] || []).map((name) => ({ key: `${field}:${name}`, kind: label, name })),
			)
		},
	},

	async mounted() {
		await this.store.previewPublish()
	},

	methods: {
		t,

		/**
		 * Publish, carrying the override only when it was actually ticked.
		 *
		 * Sending `minor` explicitly would be an assertion the author never
		 * made — and one the server is right to refuse over a removal — so the
		 * unticked case sends nothing and lets the diff decide.
		 *
		 * @return {Promise<void>} When the publish has been attempted.
		 */
		async confirm() {
			const version = await this.store.publish(this.forceMajor ? 'major' : null)

			// A refusal keeps the dialog open: its message is IN here, and
			// closing over it would leave the author with a publish that
			// silently did not happen.
			if (!version) {
				return
			}

			this.$emit('published', version)
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-flow-publish {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 8px 0;
}

.cn-flow-publish__headline {
	margin: 0;
	font-weight: bold;
}

.cn-flow-publish__verdict {
	margin: 0;
}

.cn-flow-publish__verdict--major {
	color: var(--color-warning-text, var(--color-warning));
}

.cn-flow-publish__removals {
	margin: 0;
	padding-left: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-publish__removal-kind {
	display: inline-block;
	min-width: 90px;
	color: var(--color-text-maxcontrast);
}

.cn-flow-publish__removal-name {
	font-family: var(--font-face-monospace, monospace);
}

.cn-flow-publish__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-flow-publish__refusal {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
