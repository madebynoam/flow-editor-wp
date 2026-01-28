/**
 * Hook for fetching and managing site data.
 */
import { useState, useEffect } from '@wordpress/element';
import {
    fetchPages,
    fetchTemplateParts,
    fetchPatterns,
    fetchTemplates,
    fetchNodePositions,
} from '../api';

export function useSiteData() {
    const [ pages, setPages ] = useState( [] );
    const [ templates, setTemplates ] = useState( [] );
    const [ templateParts, setTemplateParts ] = useState( [] );
    const [ patterns, setPatterns ] = useState( [] );
    const [ positions, setPositions ] = useState( {} );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    useEffect( () => {
        async function loadData() {
            try {
                setLoading( true );

                const [ pagesData, templatesData, partsData, patternsData, positionsData ] =
                    await Promise.all([
                        fetchPages(),
                        fetchTemplates(),
                        fetchTemplateParts(),
                        fetchPatterns(),
                        fetchNodePositions(),
                    ]);

                // Ensure arrays (API might return null/undefined on error).
                setPages( Array.isArray( pagesData ) ? pagesData : [] );
                setTemplates( Array.isArray( templatesData ) ? templatesData : [] );
                setTemplateParts( Array.isArray( partsData ) ? partsData : [] );
                setPatterns( Array.isArray( patternsData ) ? patternsData : [] );
                setPositions( positionsData || {} );
            } catch ( err ) {
                console.error( 'Flow Editor - Load error:', err );
                setError( err.message || 'Failed to load site data' );
            } finally {
                setLoading( false );
            }
        }

        loadData();
    }, [] );

    return {
        pages,
        templates,
        templateParts,
        patterns,
        positions,
        loading,
        error,
    };
}
