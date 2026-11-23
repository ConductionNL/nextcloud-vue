/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The CodeMirror pieces the code editors use, in one module so a bundler
 * splits them into a chunk of their own that loads with the first editor.
 */

export { html as htmlLang } from '@codemirror/lang-html'
export { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'
export { xml as xmlLang } from '@codemirror/lang-xml'
export { githubDark, githubLight } from '@uiw/codemirror-theme-github'
export { default as CodeMirror } from 'vue-codemirror6'
