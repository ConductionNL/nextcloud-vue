/**
 * Mock for `@microsoft/fetch-event-source` used by the vue-styleguidist
 * sandbox.
 *
 * The real package is declared in the library root's package.json and
 * powers `useAiChatStream` (AI Chat Companion). The deploy workflow only
 * runs `npm ci` inside `styleguide/`, so the root `node_modules` isn't
 * populated and the styleguide's webpack 4 build can't resolve the import
 * when it walks the library dep graph from `src/index.js`. AI streaming
 * has no useful demo in the styleguide sandbox (no Nextcloud server, no
 * OpenRegister), so a no-op stub keeps the build green while preserving
 * the named-export shape consumers reference.
 */

export function fetchEventSource() {
	return Promise.resolve()
}

export default { fetchEventSource }
