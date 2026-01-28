/**
 * Hook for fetching and managing site data.
 */
import { useState, useEffect } from '@wordpress/element';
import {
    fetchPages,
    fetchTemplateParts,
    fetchPatterns,
    fetchNodePositions,
} from '../api';

export function useSiteData() {
    const [ pages, setPages ] = useState( [] );
    const [ templateParts, setTemplateParts ] = useState( [] );
    const [ patterns, setPatterns ] = useState( [] );
    const [ positions, setPositions ] = useState( {} );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    useEffect( () => {
        async function loadData() {
            try {
                setLoading( true );

                const [ pagesData, partsData, patternsData, positionsData ] =
                    await Promise.all([
                        fetchPages(),
                        fetchTemplateParts(),
                        fetchPatterns(),
                        fetchNodePositions(),
                    ]);

                // Debug logging.
                console.log( 'Flow Editor - Pages:', pagesData );
                console.log( 'Flow Editor - Template Parts:', partsData );
                console.log( 'Flow Editor - Patterns:', patternsData );
                console.log( 'Flow Editor - Positions:', positionsData );

                // Ensure arrays (API might return null/undefined on error).
                setPages( Array.isArray( pagesData ) ? pagesData : [] );
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
        templateParts,
        patterns,
        positions,
        loading,
        error,
        refetch: () => {
            setLoading( true );
            Promise.all([
                fetchPages(),
                fetchTemplateParts(),
                fetchPatterns(),
            ]).then( ([ p, tp, pt ]) => {
                setPages( Array.isArray( p ) ? p : [] );
                setTemplateParts( Array.isArray( tp ) ? tp : [] );
                setPatterns( Array.isArray( pt ) ? pt : [] );
                setLoading( false );
            });
        },
    };
}
