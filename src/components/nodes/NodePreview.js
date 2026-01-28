/**
 * NodePreview - Wrapper for BlockPreview in flow nodes.
 */
import { BlockPreview } from '@wordpress/block-editor';
import { parse } from '@wordpress/blocks';
import { useMemo } from '@wordpress/element';

const NodePreview = ({ content, viewportWidth = 800 }) => {
    const blocks = useMemo( () => {
        if ( ! content ) {
            return [];
        }
        try {
            return parse( content );
        } catch ( e ) {
            console.error( 'Failed to parse blocks:', e );
            return [];
        }
    }, [ content ] );

    if ( ! blocks.length ) {
        return (
            <div className="node-preview-empty">
                No content
            </div>
        );
    }

    return (
        <div className="node-preview">
            <BlockPreview
                blocks={ blocks }
                viewportWidth={ viewportWidth }
            />
        </div>
    );
};

export default NodePreview;
