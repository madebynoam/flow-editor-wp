/**
 * Build React Flow nodes from site data.
 */

// Layout constants
const NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 250;
const VERTICAL_GAP = 180;
const PATTERN_X = 50;
const PAGE_X = 550;

/**
 * Build nodes array for React Flow.
 *
 * @param {Object} params - Site data and positions.
 * @return {Array} React Flow nodes.
 */
export function buildNodes({ pages, templates, templateParts, patterns, positions }) {
    const nodes = [];
    let patternY = 50;
    let pageY = 50;

    const adminUrl = window.flowEditorData?.adminUrl || '/wp-admin/';
    const siteEditor = window.flowEditorData?.siteEditor || `${ adminUrl }site-editor.php`;

    // Find the index/home template
    const indexTemplate = ( templates || [] ).find( t =>
        t.slug === 'index' || t.slug === 'front-page' || t.slug === 'home'
    );

    // Add Home page node first (site front page) - uses index template content
    const homeId = 'template-index';
    const homeSavedPos = positions[ homeId ];
    nodes.push({
        id: homeId,
        type: 'page',
        position: homeSavedPos || { x: PAGE_X, y: pageY },
        data: {
            title: indexTemplate?.title?.rendered || 'Home',
            content: indexTemplate?.content?.raw || '',
            link: window.flowEditorData?.homeUrl || '/',
            editUrl: `${ siteEditor }?postType=wp_template&postId=${ encodeURIComponent( indexTemplate?.id || 'theme//index' ) }`,
        },
    });
    pageY += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;

    // Add template parts (top of patterns column).
    const ajaxUrl = window.ajaxurl || '/wp-admin/admin-ajax.php';
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
                previewUrl: `${ ajaxUrl }?action=flow_editor_template_part_preview&slug=${ encodeURIComponent( part.slug ) }`,
                editUrl: `${ siteEditor }?postType=wp_template_part&postId=${ encodeURIComponent( part.id ) }`,
            },
        });

        patternY += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;
    });

    // Add patterns (below template parts).
    patterns.forEach( ( pattern, index ) => {
        const id = `pattern-${ pattern.name }`;
        const savedPos = positions[ id ];

        // Pattern edit URL - opens in site editor patterns section
        const patternEditUrl = `${ siteEditor }?path=%2Fpatterns`;

        nodes.push({
            id,
            type: 'pattern',
            position: savedPos || { x: PATTERN_X, y: patternY },
            data: {
                title: pattern.title || pattern.name,
                content: pattern.content || '',
                // Preview URL for iframe
                previewUrl: `${ ajaxUrl }?action=flow_editor_pattern_preview&pattern=${ encodeURIComponent( pattern.name ) }`,
                editUrl: patternEditUrl,
            },
        });

        patternY += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;
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
                status: page.status,
                link: page.link,
                editUrl: `${ adminUrl }post.php?post=${ page.id }&action=edit`,
            },
        });

        pageY += DEFAULT_NODE_HEIGHT + VERTICAL_GAP;
    });

    return nodes;
}
