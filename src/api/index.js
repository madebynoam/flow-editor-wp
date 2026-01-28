/**
 * REST API functions for fetching site data.
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Fetch all published pages.
 */
export async function fetchPages() {
    return apiFetch({
        path: '/wp/v2/pages?per_page=100&status=publish',
    });
}

/**
 * Fetch all template parts.
 */
export async function fetchTemplateParts() {
    return apiFetch({
        path: '/wp/v2/template-parts?per_page=100',
    });
}

/**
 * Fetch all block patterns.
 */
export async function fetchPatterns() {
    return apiFetch({
        path: '/wp/v2/block-patterns/patterns',
    });
}

/**
 * Fetch all templates.
 */
export async function fetchTemplates() {
    return apiFetch({
        path: '/wp/v2/templates?per_page=100',
    });
}

/**
 * Fetch saved node positions from plugin options.
 */
export async function fetchNodePositions() {
    return apiFetch({
        path: '/flow-editor/v1/positions',
    }).catch( () => ({}) );
}

/**
 * Save node positions to plugin options.
 */
export async function saveNodePositions( positions ) {
    return apiFetch({
        path: '/flow-editor/v1/positions',
        method: 'POST',
        data: { positions },
    });
}
