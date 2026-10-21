<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnAiFeaturesWidget — the hermiq AI features a record's type switches on for
  a surface: where each one runs (hermiq's answer; a feature hermiq does not
  offer reads unavailable, never local), a run on one of the record's
  documents with a refusal shown in words naming the feature, the reason and
  hermiq's gate, optional question prompts, and a use / adapt / reject
  decision on every suggestion for the AI oversight trail.
-->
<template>
	<div class="cn-ai-features" data-testid="cn-ai-features">
		<h3 v-if="showTitle">
			{{ title || t('nextcloud-vue', 'Assistant') }}
		</h3>

		<div v-if="loading" class="cn-ai-features__loading">
			<NcLoadingIcon :size="20" />
			{{ t('nextcloud-vue', 'Reading the AI features on this record') }}
		</div>

		<template v-else>
			<section v-if="prompts && prompts.length > 0"
				class="cn-ai-features__questions"
				data-testid="cn-ai-questions">
				<h4>{{ t('nextcloud-vue', 'Questions') }}</h4>
				<ul class="cn-ai-features__prompts">
					<li v-for="prompt in prompts" :key="prompt.id || prompt.label">
						<NcButton :disabled="asking"
							:data-testid="`cn-ai-question-${prompt.id}`"
							@click="ask(prompt)">
							{{ prompt.label }}
						</NcButton>
					</li>
				</ul>
				<div v-if="answer" class="cn-ai-features__output" data-testid="cn-ai-question-answer">
					{{ answer }}
				</div>
				<CnAiSuggestionDecision v-if="answer"
					:text="answer"
					testid="cn-ai-question-decision"
					@decide="decide('question', $event)" />
				<p v-if="answerFailed" class="cn-ai-features__unreadable" data-testid="cn-ai-question-failed">
					{{ answerFailed }}
				</p>
			</section>

			<p v-if="features === null" class="cn-ai-features__unreadable" data-testid="cn-ai-features-unreadable">
				{{ t('nextcloud-vue', 'The AI features on this record could not be read. This panel is incomplete, not empty.') }}
			</p>

			<p v-else-if="features.length === 0" class="cn-ai-features__hint" data-testid="cn-ai-features-empty">
				{{ t('nextcloud-vue', 'The type of this record switches on no AI feature here.') }}
			</p>

			<template v-else>
				<section v-for="feature in features"
					:key="feature.slug"
					class="cn-ai-features__feature"
					:data-testid="`cn-ai-feature-${feature.slug}`">
					<h4>{{ feature.slug }}</h4>
					<p class="cn-ai-features__hint" :data-testid="`cn-ai-feature-where-${feature.slug}`">
						{{ whereItRuns(feature) }}
					</p>

					<form v-if="feature.available === true"
						class="cn-ai-features__run"
						@submit.prevent="run(feature)">
						<NcSelect :inputId="fieldId(feature, 'document')"
							:inputLabel="t('nextcloud-vue', 'Document')"
							:placeholder="t('nextcloud-vue', 'Choose a document')"
							:options="documentOptions"
							:modelValue="selectedDocument(feature)"
							:data-testid="`cn-ai-feature-document-${feature.slug}`"
							@update:modelValue="chooseDocument(feature, $event)" />
						<p v-if="documents === null" class="cn-ai-features__unreadable">
							{{ t('nextcloud-vue', 'The documents on this record could not be read.') }}
						</p>

						<label :for="fieldId(feature, 'instruction')">
							{{ t('nextcloud-vue', 'What should it do with the document?') }}
						</label>
						<textarea :id="fieldId(feature, 'instruction')"
							v-model="runs[feature.slug].instruction"
							rows="2" />

						<NcButton type="submit"
							:disabled="runs[feature.slug].busy"
							:data-testid="`cn-ai-feature-run-${feature.slug}`">
							{{ t('nextcloud-vue', 'Run') }}
						</NcButton>
					</form>

					<NcNoteCard v-if="runs[feature.slug] && runs[feature.slug].refusal"
						type="warning"
						:data-testid="`cn-ai-feature-refusal-${feature.slug}`">
						<p>{{ runs[feature.slug].refusal.sentence }}</p>
						<p v-if="runs[feature.slug].refusal.gate" class="cn-ai-features__gate">
							{{ t('nextcloud-vue', 'Gate: {gate}', { gate: runs[feature.slug].refusal.gate }) }}
						</p>
					</NcNoteCard>

					<p v-if="runs[feature.slug] && runs[feature.slug].failed"
						class="cn-ai-features__unreadable"
						:data-testid="`cn-ai-feature-failed-${feature.slug}`">
						{{ t('nextcloud-vue', 'hermiq could not be reached. Nothing was run.') }}
					</p>

					<div v-if="runs[feature.slug] && runs[feature.slug].output"
						class="cn-ai-features__output"
						:data-testid="`cn-ai-feature-output-${feature.slug}`">
						{{ runs[feature.slug].output }}
					</div>
					<CnAiSuggestionDecision v-if="runs[feature.slug] && runs[feature.slug].output"
						:text="runs[feature.slug].output"
						:testid="`cn-ai-feature-decision-${feature.slug}`"
						@decide="decide(`feature:${feature.slug}`, $event)" />
				</section>

				<p class="cn-ai-features__hint">
					{{ t('nextcloud-vue', 'The assistant does nothing without your confirmation. It sees only what you see on this record.') }}
				</p>
			</template>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import CnAiSuggestionDecision from './CnAiSuggestionDecision.vue'
import {
	AiFeatureRefusal,
	askAbout,
	DEFAULT_RUN_ENDPOINT,
	fetchDocuments,
	fetchFeatures,
	fetchPrompts,
	refusalSentence,
	runFeatureOnDocument,
	whereItRuns,
} from '../../utils/aiFeatures.js'
import { createSuggestionTracker } from '../../utils/aiSuggestionTracker.js'

export default {
	name: 'CnAiFeaturesWidget',
	components: { CnAiSuggestionDecision, NcButton, NcLoadingIcon, NcNoteCard, NcSelect },

	props: {
		/** The record id (injected by CnObjectSidebar). */
		objectId: { type: String, default: '' },
		/** Register slug or id (injected by CnObjectSidebar). */
		register: { type: String, default: '' },
		/** Schema slug or id (injected by CnObjectSidebar). */
		schema: { type: String, default: '' },
		/** OpenRegister API root. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/**
		 * Where the features are declared: the record's `typeField` references
		 * a `typeSchema` object whose `field` maps feature slug to surface;
		 * the slugs placed on `surface` are shown.
		 */
		declaration: {
			type: Object,
			default: () => ({ typeField: '', typeSchema: '', field: 'aiFeatures', surface: '' }),
		},

		/** The endpoint that answers where each declared feature runs (`{features: [...]}`). */
		featuresEndpoint: { type: String, default: '' },
		/** Query key the declared slugs are sent under: `<key>[<slug>]=<surface>`. */
		featuresQueryKey: { type: String, default: 'aiFeatures' },
		/** The record's documents; empty uses OpenRegister's files of the record. */
		filesEndpoint: { type: String, default: '' },
		/** hermiq's run endpoint, with `{slug}`. */
		runEndpoint: { type: String, default: DEFAULT_RUN_ENDPOINT },
		/** Prompts offered as questions (`{prompts: [...]}`); empty offers none. */
		promptsEndpoint: { type: String, default: '' },
		/** Where a question is posted (`{<objectKey>: id, message}` → `{reply}`). */
		askEndpoint: { type: String, default: '' },
		/** The AI oversight record-action endpoint; empty reports nothing. */
		decisionEndpoint: { type: String, default: '' },
		/** Body key naming the record in the ask and decision bodies. */
		objectKey: { type: String, default: 'objectId' },
		/** Heading; empty uses "Assistant". */
		title: { type: String, default: '' },
		/** Whether the heading is drawn. */
		showTitle: { type: Boolean, default: true },
	},

	data() {
		return {
			loading: true,
			features: [],
			documents: [],
			runs: {},
			prompts: [],
			asking: false,
			answer: '',
			answerFailed: '',
		}
	},

	computed: {
		documentOptions() {
			return (this.documents || []).map((doc) => ({ id: doc.id, label: doc.title }))
		},

		resolvedFilesEndpoint() {
			return this.filesEndpoint
				|| `${this.apiBase.replace(/\/$/, '')}/objects/${this.register}/${this.schema}/${encodeURIComponent(this.objectId)}/files`
		},
	},

	created() {
		this.tracker = createSuggestionTracker({ objectId: this.objectId, objectKey: this.objectKey, endpoint: this.decisionEndpoint })
		this.onPageHide = () => this.tracker.closeAll({ leaving: true })
		window.addEventListener('pagehide', this.onPageHide)
	},

	mounted() {
		this.load()
	},

	beforeUnmount() {
		window.removeEventListener('pagehide', this.onPageHide)
		this.tracker.closeAll()
	},

	methods: {
		t,
		whereItRuns,

		/**
		 * Read the features, the prompts and (when a feature can run) the documents.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			if (this.objectId === '' || !this.featuresEndpoint) {
				this.features = null
				this.loading = false
				return
			}

			const [features, prompts] = await Promise.all([
				fetchFeatures({
					apiBase: this.apiBase.replace(/\/$/, ''),
					register: this.register,
					schema: this.schema,
					objectId: this.objectId,
					declaration: this.declaration,
					featuresEndpoint: this.featuresEndpoint,
					featuresQueryKey: this.featuresQueryKey,
				}),
				this.promptsEndpoint ? fetchPrompts(this.promptsEndpoint) : [],
			])
			this.features = features
			this.prompts = prompts || []

			const runs = {}
			for (const feature of features || []) {
				runs[feature.slug] = { documentReference: '', instruction: '', busy: false, refusal: null, failed: false, output: '' }
			}
			this.runs = runs

			const offersARun = (features || []).some((feature) => feature.available === true)
			this.documents = offersARun ? await fetchDocuments(this.resolvedFilesEndpoint) : []
			this.loading = false
		},

		selectedDocument(feature) {
			const id = this.runs[feature.slug]?.documentReference
			return this.documentOptions.find((option) => option.id === id) || null
		},

		chooseDocument(feature, option) {
			this.runs[feature.slug].documentReference = option ? String(option.id) : ''
		},

		/**
		 * Ask one of the offered prompts about this record.
		 *
		 * @param {object} prompt The prompt.
		 * @return {Promise<void>}
		 */
		async ask(prompt) {
			this.tracker.dismiss('question', 'superseded')
			this.asking = true
			this.answer = ''
			this.answerFailed = ''
			try {
				const result = await askAbout(this.askEndpoint, this.objectKey, this.objectId, prompt.prompt)
				this.answer = String(result?.reply ?? '')
				if (this.answer !== '') {
					this.tracker.show('question', { type: 'qa', text: this.answer, prompt: prompt.prompt, model: String(result?.model ?? '') })
				}
			} catch (error) {
				this.answerFailed = String(error?.response?.data?.error ?? '') || t('nextcloud-vue', 'The assistant did not answer.')
			} finally {
				this.asking = false
			}
		},

		/**
		 * Report what the person did with the suggestion in a slot.
		 *
		 * @param {string} slot     The slot key.
		 * @param {object} decision `{userAction, actualValue?}`.
		 * @return {Promise<void>}
		 */
		decide(slot, decision) {
			return this.tracker.decide(slot, decision.userAction, { actualValue: decision.actualValue })
		},

		fieldId(feature, field) {
			return `cn-ai-${this.objectId || 'unknown'}-${feature.slug}-${field}`
		},

		/**
		 * Run one feature on the chosen document, and show what came back.
		 *
		 * @param {object} feature The feature.
		 * @return {Promise<void>}
		 */
		async run(feature) {
			const state = this.runs[feature.slug]
			this.tracker.dismiss(`feature:${feature.slug}`, 'superseded')
			state.busy = true
			state.refusal = null
			state.failed = false
			state.output = ''
			try {
				const answer = await runFeatureOnDocument({
					feature: feature.slug,
					documentReference: state.documentReference,
					instruction: state.instruction,
					runEndpoint: this.runEndpoint,
				})
				state.output = String(answer?.output ?? '')
				if (state.output !== '') {
					this.tracker.show(`feature:${feature.slug}`, {
						type: 'decision_support',
						text: state.output,
						prompt: state.instruction,
						model: String(answer?.model ?? ''),
						documentId: state.documentReference,
					})
				}
			} catch (error) {
				if (error instanceof AiFeatureRefusal) {
					state.refusal = { sentence: refusalSentence(error, feature.slug), gate: error.gate }
				} else {
					state.failed = true
				}
			} finally {
				state.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-ai-features {
	padding: 12px;
}

.cn-ai-features__loading {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-ai-features__feature,
.cn-ai-features__questions {
	margin-bottom: 16px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-ai-features__prompts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	list-style: none;
	margin: 0 0 8px;
	padding: 0;
}

.cn-ai-features__run {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 8px 0;
}

.cn-ai-features__hint,
.cn-ai-features__gate {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-ai-features__output {
	white-space: pre-wrap;
	padding: 8px;
	background: var(--color-background-dark);
	border-radius: var(--border-radius);
}

.cn-ai-features__unreadable {
	color: var(--color-warning-text, var(--color-main-text));
}
</style>
