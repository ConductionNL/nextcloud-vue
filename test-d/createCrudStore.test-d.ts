import type { BaseActions } from '../src/store/createCrudStore.js'

import { expectAssignable, expectType } from 'tsd'
import { createCrudStore } from '../src/store/createCrudStore.js'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

class Source {
	id!: number
	name!: string
	constructor(_d: any) { /* noop */ }
}

interface LogShape { id: number, message: string }

// ─────────────────────────────────────────────────────────────────────────────
// Entity inference
// ─────────────────────────────────────────────────────────────────────────────

const useSourceStore = createCrudStore('source', {
	endpoint: 'sources',
	entity: Source,
})
const source = useSourceStore()

// item / list inferred as Source
expectType<Source | null>(source.item)
expectType<Source[]>(source.list)

// base actions typed
expectType<(id: string | number) => Promise<Source>>(source.getOne)
expectType<(item: Partial<Source>) => Promise<{ response: Response, data: Source }>>(source.save)

// deleteOne accepts both id and item
expectAssignable<Parameters<typeof source.deleteOne>[0]>(1)
expectAssignable<Parameters<typeof source.deleteOne>[0]>('abc')
expectAssignable<Parameters<typeof source.deleteOne>[0]>({ id: 1 })

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag: loading
// ─────────────────────────────────────────────────────────────────────────────

const useLoading = createCrudStore('l', {
	endpoint: 'x',
	entity: Source,
	features: { loading: true },
})()

expectType<boolean>(useLoading.loading)
expectType<string | null>(useLoading.error)
expectType<boolean>(useLoading.isLoading)
expectType<string | null>(useLoading.getError)

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag: viewMode
// ─────────────────────────────────────────────────────────────────────────────

const useViewMode = createCrudStore('v', {
	endpoint: 'x',
	entity: Source,
	features: { viewMode: true },
})()

expectType<string>(useViewMode.viewMode)
expectType<string>(useViewMode.getViewMode)
expectType<(mode: string) => void>(useViewMode.setViewMode)

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags absent → nothing is narrowed, which is not what we want
//
// `PluginActionContribution` puts a string-index signature on MergedActions, so
// ANY name resolves to an `any`-returning callable on a store that never asked
// for the feature. This section used to say the state properties were "correctly
// absent" and asserted nothing, so the claim was never checked; it is false.
// `useBare.viewMode` and `useBare.loading` both resolve, as callables.
//
// Pinned as it actually behaves rather than as we wish, so that narrowing the
// index signature turns these two lines red on purpose. See issue #1112.
// ─────────────────────────────────────────────────────────────────────────────

const useBare = createCrudStore('b', {
	endpoint: 'x',
	entity: Source,
})()

// Asserted, not merely asserted about: without the flags the two state
// properties do not exist, and nothing here checked that until now.
expectType<(...args: any[]) => any>(useBare.viewMode)
expectType<(...args: any[]) => any>(useBare.loading)

// ─────────────────────────────────────────────────────────────────────────────
// extend.state merges
// ─────────────────────────────────────────────────────────────────────────────

const useExt = createCrudStore('e', {
	endpoint: 'x',
	entity: Source,
	extend: {
		state: () => ({ extra: 42, custom: 'hi' }),
	},
})()

expectType<number>(useExt.extra)
expectType<string>(useExt.custom)
// base state still present
expectType<Source | null>(useExt.item)

// ─────────────────────────────────────────────────────────────────────────────
// extend.actions — `this` sees merged store
// ─────────────────────────────────────────────────────────────────────────────

createCrudStore('a', {
	endpoint: 'x',
	entity: Source,
	features: { loading: true },
	extend: {
		state: () => ({ sourceTest: null as object | null }),
		actions: {
			foo() {
				// base state
				expectType<Source | null>(this.item)
				expectType<Source[]>(this.list)
				// extend state
				expectType<object | null>(this.sourceTest)
				// base action callable from `this`
				expectType<(data: Source | Partial<Source> | null) => void>(this.setItem)
				// feature-gated state reachable when feature is on
				expectType<boolean>(this.loading)
			},
			bar(arg: string) {
				this.sourceTest = { hello: arg }
				this.setItem(null)
			},
		},
	},
})

// ─────────────────────────────────────────────────────────────────────────────
// extend.actions — override precedence
// ─────────────────────────────────────────────────────────────────────────────

const useOverride = createCrudStore('o', {
	endpoint: 'x',
	entity: Source,
	extend: {
		actions: {
			// narrower signature than base
			setItem(data: Source) { this.item = data },
		},
	},
})()

// overridden signature wins
expectType<(data: Source) => void>(useOverride.setItem)
// base action NOT overridden remains
expectType<BaseActions<Source>['refreshList']>(useOverride.refreshList)

// ─────────────────────────────────────────────────────────────────────────────
// extend.getters — read-only computed on the store
// ─────────────────────────────────────────────────────────────────────────────

const useGetters = createCrudStore('g', {
	endpoint: 'x',
	entity: Source,
	extend: {
		state: () => ({ count: 0 as number }),
		getters: {
			doubled(state): number { return state.count * 2 },
		},
	},
})()

expectType<number>(useGetters.doubled)

// ─────────────────────────────────────────────────────────────────────────────
// Overload 2 — raw-data mode
// ─────────────────────────────────────────────────────────────────────────────

const useLog = createCrudStore<'log', LogShape>('log', {
	endpoint: 'logs',
})()

expectType<LogShape | null>(useLog.item)
expectType<LogShape[]>(useLog.list)
expectType<(id: string | number) => Promise<LogShape>>(useLog.getOne)

// ─────────────────────────────────────────────────────────────────────────────
// Negative cases — calls that should be type errors
// ─────────────────────────────────────────────────────────────────────────────

// endpoint is required
// @ts-expect-error — config.endpoint missing
createCrudStore('missing', {})
// @ts-expect-error — features expects an object, not a string
createCrudStore('bad-features', { endpoint: 'xs', features: 'loading' })

// @ts-expect-error — save expects Partial<Source>, not a primitive
useSourceStore().save(123)

// Note: setItem uses a method signature, which is subject to TypeScript's
// bivariant parameter checking, so calls with wrong primitive types may
// not always be flagged. The positive-type assertions above are the
// authoritative check for the setItem signature.
