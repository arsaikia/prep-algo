/**
 * Pure Markdown helpers for the System Design reader.
 *
 * Heading ids are assigned by a rehype plugin that runs *after*
 * rehype-sanitize, so they are not clobbered with the `user-content-` prefix
 * and `#deep-dives` style links work. The table of contents is extracted from
 * the Markdown source with the same slugger, in the same order, so the TOC
 * links and the rendered ids always agree.
 */

export function slugify(text) {
    const slug = String(text ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-');
    return slug || 'section';
}

export function createSlugger() {
    const seen = new Map();
    return (text) => {
        const base = slugify(text);
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return count === 0 ? base : `${base}-${count}`;
    };
}

/** Reduces inline Markdown to the text a reader would see. */
export function plainHeadingText(raw) {
    return String(raw ?? '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(\*|_)(.+?)\1/g, '$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
        .trim();
}

/**
 * ATX headings outside fenced code, in document order, with the ids the
 * renderer will give them. Every level goes through the slugger (so
 * duplicate counting matches the renderer); `minDepth`/`maxDepth` only filter
 * what is returned.
 */
export function extractHeadings(markdown, { minDepth = 2, maxDepth = 3 } = {}) {
    const slug = createSlugger();
    const headings = [];
    let fence = null;
    for (const line of String(markdown ?? '').split(/\r?\n/)) {
        const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (fenceMatch) {
            const marker = fenceMatch[1];
            if (!fence) fence = marker;
            else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
            continue;
        }
        if (fence) continue;
        const match = line.match(/^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/);
        if (!match) continue;
        const depth = match[1].length;
        const text = plainHeadingText(match[2]);
        const id = slug(text);
        if (depth >= minDepth && depth <= maxDepth) headings.push({ depth, text, id });
    }
    return headings;
}

export function hastText(node) {
    if (!node) return '';
    if (node.type === 'text') return node.value;
    return (node.children || []).map(hastText).join('');
}

function classList(node) {
    const value = node?.properties?.className;
    if (Array.isArray(value)) return value.map(String);
    return typeof value === 'string' ? value.split(/\s+/) : [];
}

/** The `code` child of a `<pre>` fence tagged `mermaid`, or null. */
export function mermaidCode(preNode) {
    if (preNode?.tagName !== 'pre') return null;
    const code = (preNode.children || []).find((child) => child.type === 'element');
    if (code?.tagName !== 'code') return null;
    return classList(code).includes('language-mermaid') ? code : null;
}

/**
 * rehype plugin: stable heading ids, and an accessible label on each Mermaid
 * fence taken from the closest preceding heading. Must run after
 * rehype-sanitize.
 */
export function rehypeReaderEnhancements() {
    return (tree) => {
        const slug = createSlugger();
        let lastHeading = '';
        const visit = (node) => {
            if (node.type !== 'element' && node.type !== 'root') return;
            if (node.type === 'element') {
                if (/^h[1-6]$/.test(node.tagName)) {
                    const text = hastText(node).trim();
                    node.properties = node.properties || {};
                    // Footnote headings arrive with a (prefixed) id other
                    // markup refers to; leave those alone.
                    if (!node.properties.id) {
                        node.properties.id = slug(text);
                        lastHeading = text;
                    }
                    return;
                }
                const code = mermaidCode(node);
                if (code) {
                    code.properties.dataDiagramLabel = lastHeading || 'Diagram';
                    return;
                }
            }
            (node.children || []).forEach(visit);
        };
        visit(tree);
    };
}
