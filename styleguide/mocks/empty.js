// Stub for `marked` in the styleguide — cnRenderMarkdown uses `new Marked()`
// which only runs inside CnWikiPage/CnChatPage at runtime in a real Nextcloud
// server. The styleguide just needs the component to mount.
export class Marked {
	constructor() {}
	parse(src) { return src || '' }
	use() {}
}
export function marked(src) { return src || '' }
export default { Marked, marked }
