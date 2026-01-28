/**
 * Flow Editor Canvas - React Flow wrapper with real data.
 */
import { useCallback, useMemo, useEffect } from '@wordpress/element';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSiteData } from '../hooks/useSiteData';
import { buildRelationshipGraph } from '../utils/parseRelationships';
import { buildNodes } from '../utils/buildNodes';
import { nodeTypes } from './nodes';
import { saveNodePositions } from '../api';
import './Canvas.scss';

const Canvas = () => {
    const { pages, templateParts, patterns, positions, loading, error } = useSiteData();

    // Build nodes and edges from data.
    const initialNodes = useMemo( () => {
        if ( loading ) return [];
        return buildNodes({ pages, templateParts, patterns, positions });
    }, [ pages, templateParts, patterns, positions, loading ] );

    const initialEdges = useMemo( () => {
        if ( loading ) return [];
        const { edges } = buildRelationshipGraph({ pages, templateParts, patterns });
        return edges.map( ( edge ) => ({
            ...edge,
            animated: false,
            style: { stroke: '#666', strokeWidth: 2 },
        }));
    }, [ pages, templateParts, patterns, loading ] );

    const [ nodes, setNodes, onNodesChange ] = useNodesState( [] );
    const [ edges, setEdges, onEdgesChange ] = useEdgesState( [] );

    // Update nodes/edges when data loads.
    useEffect( () => {
        if ( ! loading ) {
            setNodes( initialNodes );
            setEdges( initialEdges );
        }
    }, [ initialNodes, initialEdges, loading, setNodes, setEdges ] );

    // Save positions on drag end.
    const onNodeDragStop = useCallback( ( event, node ) => {
        const newPositions = {};
        nodes.forEach( ( n ) => {
            newPositions[ n.id ] = n.id === node.id ? node.position : n.position;
        });
        saveNodePositions( newPositions );
    }, [ nodes ] );

    // Highlight connections on node hover.
    const onNodeMouseEnter = useCallback( ( event, node ) => {
        setEdges( ( eds ) =>
            eds.map( ( edge ) => {
                const isConnected = edge.source === node.id || edge.target === node.id;
                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        stroke: isConnected ? '#007cba' : '#444',
                        strokeWidth: isConnected ? 3 : 2,
                        opacity: isConnected ? 1 : 0.3,
                    },
                    animated: isConnected,
                };
            })
        );
    }, [ setEdges ] );

    const onNodeMouseLeave = useCallback( () => {
        setEdges( ( eds ) =>
            eds.map( ( edge ) => ({
                ...edge,
                style: { stroke: '#666', strokeWidth: 2, opacity: 1 },
                animated: false,
            }))
        );
    }, [ setEdges ] );

    if ( loading ) {
        return (
            <div className="flow-editor-canvas flow-editor-loading">
                <p>Loading site data...</p>
            </div>
        );
    }

    if ( error ) {
        return (
            <div className="flow-editor-canvas flow-editor-error">
                <p>Error: { error }</p>
            </div>
        );
    }

    return (
        <div className="flow-editor-canvas">
            <ReactFlow
                nodes={ nodes }
                edges={ edges }
                onNodesChange={ onNodesChange }
                onEdgesChange={ onEdgesChange }
                onNodeDragStop={ onNodeDragStop }
                onNodeMouseEnter={ onNodeMouseEnter }
                onNodeMouseLeave={ onNodeMouseLeave }
                nodeTypes={ nodeTypes }
                fitView
                attributionPosition="bottom-left"
            >
                <Controls />
                <Background variant="dots" gap={ 12 } size={ 1 } />
            </ReactFlow>
        </div>
    );
};

export default Canvas;
