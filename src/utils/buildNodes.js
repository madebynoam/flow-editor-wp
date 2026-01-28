/**
 * Build React Flow nodes from site data.
 */

const GRID_GAP_X = 300;
const GRID_GAP_Y = 200;
const PATTERN_X = 50;
const PAGE_X = 400;

/**
 * Build nodes array for React Flow.
 *
 * @param {Object} params - Site data and positions.
 * @return {Array} React Flow nodes.
 */
export function buildNodes({ pages, templateParts, patterns, positions }) {
    const nodes = [];
    let patternY = 50;
    let pageY = 50;

    // Add template parts (top of patterns column).
    templateParts.forEach( ( part, index ) => {
        const id = `part-${ part.slug }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'templatePart',
            position: savedPos || { x: PATTERN_X, y: patternY },
            data: {
                title: part.title?.rendered || part.slug,
                content: part.content?.raw || '',
                area: part.area,
                editUrl: `${ window.flowEditorData?.siteEditor }?postType=wp_template_part&postId=${ encodeURIComponent( part.id ) }`,
            },
        });

        patternY += GRID_GAP_Y;
    });

    // Add patterns (below template parts).
    patterns.forEach( ( pattern, index ) => {
        const id = `pattern-${ pattern.name }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'pattern',
            position: savedPos || { x: PATTERN_X, y: patternY },
            data: {
                title: pattern.title || pattern.name,
                content: pattern.content || '',
            },
        });

        patternY += GRID_GAP_Y;
    });

    // Add pages (right column).
    pages.forEach( ( page, index ) => {
        const id = `page-${ page.id }`;
        const savedPos = positions[ id ];

        nodes.push({
            id,
            type: 'page',
            position: savedPos || { x: PAGE_X, y: pageY },
            data: {
                title: page.title?.rendered || 'Untitled',
                content: page.content?.raw || page.content?.rendered || '',
                editUrl: `${ window.flowEditorData?.siteEditor }?postType=page&postId=${ page.id }`,
            },
        });

        pageY += GRID_GAP_Y;
    });

    return nodes;
}
