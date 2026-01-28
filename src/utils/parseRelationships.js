/**
 * Parse block content to find pattern/template-part relationships.
 */

/**
 * Extract pattern slugs from block content string.
 *
 * Looks for: <!-- wp:pattern {"slug":"namespace/pattern-name"} /-->
 *
 * @param {string} content - Raw block content.
 * @return {string[]} Array of pattern slugs found.
 */
export function extractPatternSlugs( content ) {
    if ( ! content ) {
        return [];
    }

    const patternRegex = /<!-- wp:pattern \{"slug":"([^"]+)"\}/g;
    const slugs = [];
    let match;

    while ( ( match = patternRegex.exec( content ) ) !== null ) {
        slugs.push( match[ 1 ] );
    }

    return slugs;
}

/**
 * Extract template part slugs from block content string.
 *
 * Looks for: <!-- wp:template-part {"slug":"header"} /-->
 *
 * @param {string} content - Raw block content.
 * @return {string[]} Array of template part slugs found.
 */
export function extractTemplatePartSlugs( content ) {
    if ( ! content ) {
        return [];
    }

    const partRegex = /<!-- wp:template-part \{[^}]*"slug":"([^"]+)"[^}]*\}/g;
    const slugs = [];
    let match;

    while ( ( match = partRegex.exec( content ) ) !== null ) {
        slugs.push( match[ 1 ] );
    }

    return slugs;
}

/**
 * Build a relationship graph from site data.
 *
 * @param {Object} params - Site data.
 * @param {Array} params.pages - Array of page objects.
 * @param {Array} params.templateParts - Array of template part objects.
 * @param {Array} params.patterns - Array of pattern objects.
 * @return {Object} Relationship graph with edges.
 */
export function buildRelationshipGraph({ pages, templateParts, patterns }) {
    const edges = [];

    // Map patterns by slug for lookup.
    const patternsBySlug = {};
    patterns.forEach( ( pattern ) => {
        if ( pattern.name ) {
            patternsBySlug[ pattern.name ] = pattern;
        }
    });

    // Map template parts by slug for lookup.
    const partsBySlug = {};
    templateParts.forEach( ( part ) => {
        if ( part.slug ) {
            partsBySlug[ part.slug ] = part;
        }
    });

    // Find relationships in pages.
    pages.forEach( ( page ) => {
        const content = page.content?.raw || page.content?.rendered || '';

        // Find pattern references.
        const patternSlugs = extractPatternSlugs( content );
        patternSlugs.forEach( ( slug ) => {
            if ( patternsBySlug[ slug ] ) {
                edges.push({
                    id: `pattern-${ slug }-page-${ page.id }`,
                    source: `pattern-${ slug }`,
                    target: `page-${ page.id }`,
                    type: 'pattern',
                });
            }
        });

        // Find template part references.
        const partSlugs = extractTemplatePartSlugs( content );
        partSlugs.forEach( ( slug ) => {
            if ( partsBySlug[ slug ] ) {
                edges.push({
                    id: `part-${ slug }-page-${ page.id }`,
                    source: `part-${ slug }`,
                    target: `page-${ page.id }`,
                    type: 'template-part',
                });
            }
        });
    });

    // Find relationships in template parts (parts can reference patterns).
    templateParts.forEach( ( part ) => {
        const content = part.content?.raw || part.content?.rendered || '';

        const patternSlugs = extractPatternSlugs( content );
        patternSlugs.forEach( ( slug ) => {
            if ( patternsBySlug[ slug ] ) {
                edges.push({
                    id: `pattern-${ slug }-part-${ part.slug }`,
                    source: `pattern-${ slug }`,
                    target: `part-${ part.slug }`,
                    type: 'pattern',
                });
            }
        });
    });

    return { edges };
}
