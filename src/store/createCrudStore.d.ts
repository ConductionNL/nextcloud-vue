/**
 * Hand-written type definitions for `createCrudStore` (implementation is in
 * `createCrudStore.js`). The library ships as JavaScript, but this file gives
 * TypeScript consumers full entity inference, feature-flag gating, and
 * `extend` merging with correct `this` typing.
 *
 * Design notes:
 * - `const Id extends string` / `const F extends Features` preserves literal
 *   types so `features: { loading: true }` flows `true` through the
 *   conditional types without requiring `as const` at the call site.
 *   Requires TypeScript 5.0+.
 * - Entity inference: if `config.entity` is a class constructor, `T` is the
 *   instance type. Otherwise `T` falls back to `unknown` unless the caller
 *   passes it explicitly via the second overload.
 * - `ThisType<...>` inside `extend.actions` / `extend.getters` makes `this`
 *   resolve to the fully-merged store (state + getters + base actions +
 *   extended actions), matching Pinia's own runtime semantics.
 * - `Omit<BaseActions<T>, keyof ExtActions>` implements override precedence:
 *   an extend action with the same name as a base action replaces it.
 */

import type { StoreDefinition, _GettersTree } from 'pinia'

// ─────────────────────────────────────────────────────────────────────────────
// Utility types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forces TypeScript to eagerly evaluate an intersection of types into a
 * single flat object shape. Purely a hover/tooltip ergonomics helper —
 * semantically identical to the input.
 *
 * Without this, VSCode's quick-info tooltip shows `StoreDefinition<...,
 * FullState<Source, ...> & ..., ..., MergedActions<...>>` with the aliases
 * left unexpanded, making it hard to see which properties the store has.
 * With this, hover shows `{ item: Source | null; list: Source[]; ... }`
 * directly.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

/**
 * A class constructor accepting raw data (e.g. `new Source(data)`).
 */
export type EntityClass<T> = new (data: any) => T

/**
 * Extract the instance type from an entity-class config field.
 * Falls back to `unknown` when no class is provided.
 */
export type InferEntity<E> =
	E extends EntityClass<infer T> ? T :
	E extends null | undefined ? unknown :
	unknown

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags
// ─────────────────────────────────────────────────────────────────────────────

export interface Features {
	loading?: boolean
	viewMode?: boolean
}

export type LoadingState<F>  = F extends { loading: true }  ? { loading: boolean; error: string | null } : {}
export type ViewModeState<F> = F extends { viewMode: true } ? { viewMode: string } : {}

// Getter trees are declared as `(state) => value` and Pinia exposes them on
// the store as `.name: value`. We declare them as getter functions so the
// `StoreDefinition<..., Getters, ...>` return-type mapping kicks in.
export type LoadingGetters<F> = F extends { loading: true }
	? {
		isLoading: (state: { loading: boolean }) => boolean
		getError: (state: { error: string | null }) => string | null
	}
	: {}
export type ViewModeGetters<F> = F extends { viewMode: true }
	? { getViewMode: (state: { viewMode: string }) => string }
	: {}

export type ViewModeActions<F> = F extends { viewMode: true } ? { setViewMode(mode: string): void } : {}

// ─────────────────────────────────────────────────────────────────────────────
// Base state, getters and actions
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseState<T> {
	item: T | null
	list: T[]
	filters: Record<string, unknown>
	pagination: { page: number; limit: number }
	_options: { endpoint: string; cleanFields: readonly string[]; baseApiUrl: string; entity: EntityClass<T> | null }
}

export interface BaseActions<T> {
	setItem(data: T | Partial<T> | null): void
	setList(data: Array<T | Partial<T>>): void
	setPagination(page: number, limit?: number): void
	setFilters(filters: Record<string, unknown>): void
	refreshList(search?: string | null, soft?: boolean): Promise<{ response: Response; data: T[] }>
	getOne(id: string | number): Promise<T>
	deleteOne(idOrItem: string | number | { id: string | number }): Promise<{ response: Response }>
	save(item: Partial<T>): Promise<{ response: Response; data: T }>
	cleanForSave(item: T | Partial<T>): Partial<T>
}

/**
 * Action merge rule:
 *   - Base actions not overridden by the extend block are preserved.
 *   - Actions declared in `extend.actions` replace base actions of the same name.
 *   - `viewMode` feature action is appended when the flag is set.
 *   - Plugin-contributed actions are reachable via the loose index signature
 *     on `PluginActionContribution` below (typed as `any`-returning callables).
 */
export type PluginActionContribution = { [key: string]: (...args: any[]) => any }

export type MergedActions<T, ExtActions, F> =
	Omit<BaseActions<T>, keyof ExtActions> & ExtActions & ViewModeActions<F> & PluginActionContribution

// ─────────────────────────────────────────────────────────────────────────────
// Full store shape (state + getters + actions) used inside ThisType<...>
// ─────────────────────────────────────────────────────────────────────────────

// Plugins contribute arbitrary state, getters, and actions at runtime. We spread
// a loose index signature into the resolved store shape so plugin-contributed
// members are reachable via dot access without `as any`. The index signature
// returns `any` (not `unknown`) so callable plugin actions (`store.refreshLogs()`)
// type-check without an intermediate cast — trade-off is that typos on
// plugin-contributed members are not caught. Plugins needing strict typing
// should ship their own `.d.ts` augmenting the specific store.
export type PluginContribution = { [key: string]: any }

export type FullState<T, ExtState, F> =
	BaseState<T> & ExtState & LoadingState<F> & ViewModeState<F> & PluginContribution

export type FullGetters<ExtGetters, F> =
	ExtGetters & LoadingGetters<F> & ViewModeGetters<F>

export type StoreThis<T, ExtState, ExtGetters, ExtActions, F> =
	FullState<T, ExtState, F> &
	// Getters are callable-free on the Pinia store instance — accessed as properties.
	// We narrow each getter declaration to its return type so `this.myGetter` is typed.
	{ [K in keyof ExtGetters]: ExtGetters[K] extends (state: any) => infer R ? R : never } &
	LoadingGetters<F> & ViewModeGetters<F> &
	MergedActions<T, ExtActions, F>

// ─────────────────────────────────────────────────────────────────────────────
// Plugins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A plugin definition. Merged into the store at creation time:
 * state is spread into store state, getters into getters, actions into actions.
 *
 * Merge precedence: base actions → plugin actions → extend.actions.
 *
 * Plugin-contributed properties are loosely typed on the resulting store
 * (they appear as unknown state / any-returning actions). Consumers needing
 * strict types on plugin output should augment the store's types at the
 * call site, or use a plugin that ships a dedicated `.d.ts` with the shape.
 */
export interface CrudPlugin {
	name: string
	state?: () => Record<string, unknown>
	getters?: Record<string, (state: any) => unknown>
	actions?: Record<string, (...args: any[]) => any>
}

export interface PluginContrib {
	[key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Config & extend shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtendConfig<
	T,
	ExtState extends Record<string, unknown>,
	ExtGetters extends _GettersTree<BaseState<T> & ExtState>,
	ExtActions extends Record<string, (...args: any[]) => any>,
	F extends Features,
> {
	state?: () => ExtState
	getters?: ExtGetters & ThisType<StoreThis<T, ExtState, ExtGetters, ExtActions, F>>
	actions?: ExtActions & ThisType<StoreThis<T, ExtState, ExtGetters, ExtActions, F>>
}

export interface CrudConfig<
	T,
	ExtState extends Record<string, unknown>,
	ExtGetters extends _GettersTree<BaseState<T> & ExtState>,
	ExtActions extends Record<string, (...args: any[]) => any>,
	F extends Features,
	Entity = EntityClass<T> | null | undefined,
> {
	endpoint: string
	baseUrl?: string
	entity?: Entity
	cleanFields?: readonly string[]
	features?: F
	parseListResponse?: (this: StoreThis<T, ExtState, ExtGetters, ExtActions, F>, json: unknown) => T[] | Array<Partial<T>>
	plugins?: readonly CrudPlugin[]
	extend?: ExtendConfig<T, ExtState, ExtGetters, ExtActions, F>
}

// ─────────────────────────────────────────────────────────────────────────────
// The factory — overloaded
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overload 1 — entity inference.
 *
 * Provide `config.entity` as a class constructor; `T` is inferred as the
 * instance type:
 *
 * ```ts
 * const useSourceStore = createCrudStore('source', {
 *     endpoint: 'sources',
 *     entity: Source,            // T = Source
 *     features: { loading: true },
 * })
 * ```
 */
export function createCrudStore<
	Entity extends EntityClass<any>,
	const Id extends string = string,
	const F extends Features = {},
	ExtState extends Record<string, unknown> = {},
	ExtGetters extends _GettersTree<BaseState<InferEntity<Entity>> & ExtState> = {},
	ExtActions extends Record<string, (...args: any[]) => any> = {},
>(
	name: Id,
	config: CrudConfig<InferEntity<Entity>, ExtState, ExtGetters, ExtActions, F, Entity>,
): StoreDefinition<
	Id,
	Prettify<FullState<InferEntity<Entity>, ExtState, F>>,
	Prettify<FullGetters<ExtGetters, F>>,
	Prettify<MergedActions<InferEntity<Entity>, ExtActions, F>>
>

/**
 * Overload 2 — explicit `T` for raw-data stores (no entity class).
 *
 * ```ts
 * interface LogShape { id: number; message: string }
 * const useLogStore = createCrudStore<'log', LogShape>('log', { endpoint: 'logs' })
 * ```
 */
export function createCrudStore<
	const Id extends string,
	T,
	const F extends Features = {},
	ExtState extends Record<string, unknown> = {},
	ExtGetters extends _GettersTree<BaseState<T> & ExtState> = {},
	ExtActions extends Record<string, (...args: any[]) => any> = {},
>(
	name: Id,
	config: CrudConfig<T, ExtState, ExtGetters, ExtActions, F, null | undefined>,
): StoreDefinition<
	Id,
	FullState<T, ExtState, F>,
	FullGetters<ExtGetters, F>,
	MergedActions<T, ExtActions, F>
>
