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

                setPages( pagesData );
                setTemplateParts( partsData );
                setPatterns( patternsData );
                setPositions( positionsData );
            } catch ( err ) {
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
                setPages( p );
                setTemplateParts( tp );
                setPatterns( pt );
                setLoading( false );
            });
        },
    };
}
