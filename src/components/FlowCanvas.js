/**
 * Flow Editor Canvas - BlockPreview in editor context.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from '@wordpress/element';
import { BlockPreview } from '@wordpress/block-editor';
import { parse } from '@wordpress/blocks';
import { useSiteData } from '../hooks/useSiteData';
import { buildNodes } from '../utils/buildNodes';
import { buildRelationshipGraph } from '../utils/parseRelationships';
import { saveNodePositions } from '../api';

// Node dimensions
const NODE_WIDTH = 280;
const NODE_HEIGHT = 220;
const SPACING_X = NODE_WIDTH + 200;
const SPACING_Y = NODE_HEIGHT + 150;
const PREVIEW_WIDTH = 800; // BlockPreview viewport width

/**
 * Organize layout - spreads nodes in a balanced 3-column grid.
 */
function organizeLayout( nodes ) {
    if ( ! nodes || nodes.length === 0 ) return {};

    const result = {};
    const COL_WIDTH = 400;
    const ROW_HEIGHT = SPACING_Y + 80;
    const PAGES_PER_ROW = 3;

    // Group nodes by type
    const byType = { templatePart: [], pattern: [], page: [] };
    nodes.forEach( node => {
        const type = node.type || 'page';
        if ( byType[ type ] ) {
            byType[ type ].push( node );
        } else {
            byType.page.push( node );
        }
    });

    // Row 1: Template parts (side by side)
    byType.templatePart.forEach( ( node, i ) => {
        result[ node.id ] = { x: 50 + i * COL_WIDTH, y: 50 };
    });

    // Row 2: Patterns (side by side)
    const patternsY = 50 + ROW_HEIGHT;
    byType.pattern.forEach( ( node, i ) => {
        const col = i % 4;
        const row = Math.floor( i / 4 );
        result[ node.id ] = { x: 50 + col * COL_WIDTH, y: patternsY + row * ROW_HEIGHT };
    });

    // Row 3+: Pages (grid layout)
    const patternRows = Math.ceil( byType.pattern.length / 4 ) || 1;
    const pagesY = patternsY + patternRows * ROW_HEIGHT;
    byType.page.forEach( ( node, i ) => {
        const col = i % PAGES_PER_ROW;
        const row = Math.floor( i / PAGES_PER_ROW );
        result[ node.id ] = { x: 50 + col * COL_WIDTH, y: pagesY + row * ROW_HEIGHT };
    });

    return result;
}

const FlowNode = ({ node, onDoubleClick, onDragStart, isDragging, isAnimating }) => {
    const { type, position, data } = node;
    const [ blocks, setBlocks ] = useState( [] );

    // Parse block content on mount
    useEffect( () => {
        if ( data.content ) {
            try {
                const parsed = parse( data.content );
                setBlocks( parsed );
            } catch ( e ) {
                console.error( 'Failed to parse blocks:', e );
            }
        }
    }, [ data.content ] );

    const handleMouseDown = ( e ) => {
        e.stopPropagation();
        onDragStart( node.id, e );
    };

    const typeColors = {
        page: '#4ab866',
        pattern: '#9b59b6',
        templatePart: '#3498db',
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: isAnimating ? 'left 0.5s ease-out, top 0.5s ease-out' : 'none',
            }}
            onMouseDown={ handleMouseDown }
            onDoubleClick={ ( e ) => {
                e.stopPropagation();
                onDoubleClick( data.editUrl );
            }}
        >
            {/* Label ABOVE frame */}
            <div style={{
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
            }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: typeColors[ type ] || '#888',
                }} />
                <span style={{
                    fontSize: 11,
                    color: '#333',
                    fontWeight: 500,
                }}>
                    { data.title }
                </span>
                { data.status && data.status !== 'publish' && (
                    <span style={{
                        fontSize: 9,
                        color: '#888',
                        textTransform: 'uppercase',
                        background: '#eee',
                        padding: '2px 4px',
                        borderRadius: 3,
                    }}>
                        { data.status }
                    </span>
                )}
            </div>

            {/* Frame with BlockPreview */}
            <div
                style={{
                    width: NODE_WIDTH,
                    background: '#fff',
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxShadow: isDragging
                        ? '0 16px 48px rgba(0,0,0,0.3)'
                        : '0 1px 8px rgba(0,0,0,0.12)',
                    transition: isDragging ? 'none' : 'box-shadow 0.2s',
                }}
                onMouseEnter={ e => {
                    if ( ! isDragging ) {
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                    }
                }}
                onMouseLeave={ e => {
                    if ( ! isDragging ) {
                        e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.12)';
                    }
                }}
            >
                { blocks.length > 0 ? (
                    <BlockPreview
                        blocks={ blocks }
                        viewportWidth={ PREVIEW_WIDTH }
                    />
                ) : (
                    <div style={{
                        height: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: 12,
                        background: '#fafafa',
                    }}>
                        { data.content ? 'Loading preview...' : 'No content' }
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Connection lines SVG.
 */
const DEFAULT_NODE_HEIGHT = 150;

const Connections = ({ nodes, edges, pan, zoom }) => {
    const nodeMap = {};
    nodes.forEach( n => nodeMap[ n.id ] = n );

    return (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            <g transform={ `translate(${ pan.x }, ${ pan.y }) scale(${ zoom })` }>
                { edges.map( edge => {
                    const source = nodeMap[ edge.source ];
                    const target = nodeMap[ edge.target ];
                    if ( ! source || ! target ) return null;

                    const labelOffset = 24;

                    // Connect from right edge of source to left edge of target
                    const x1 = source.position.x + NODE_WIDTH;
                    const y1 = source.position.y + labelOffset + DEFAULT_NODE_HEIGHT / 2;
                    const x2 = target.position.x;
                    const y2 = target.position.y + labelOffset + DEFAULT_NODE_HEIGHT / 2;

                    const dx = Math.abs( x2 - x1 );
                    const controlOffset = Math.min( dx * 0.5, 80 );

                    return (
                        <g key={ edge.id }>
                            <path
                                d={ `M ${ x1 } ${ y1 } C ${ x1 + controlOffset } ${ y1 }, ${ x2 - controlOffset } ${ y2 }, ${ x2 } ${ y2 }` }
                                fill="none"
                                stroke="#ccc"
                                strokeWidth={ 1.5 }
                            />
                            <circle cx={ x1 } cy={ y1 } r={ 4 } fill="#fff" stroke="#ccc" strokeWidth={ 1.5 } />
                            <circle cx={ x2 } cy={ y2 } r={ 4 } fill="#fff" stroke="#ccc" strokeWidth={ 1.5 } />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
};

/**
 * MiniMap component.
 */
const MiniMap = ({ nodes, pan, zoom, containerSize }) => {
    const scale = 0.025;

    const typeColors = {
        page: '#4ab866',
        pattern: '#9b59b6',
        templatePart: '#3498db',
    };

    const viewportWidth = ( containerSize.width / zoom ) * scale;
    const viewportHeight = ( containerSize.height / zoom ) * scale;
    const viewportX = ( -pan.x / zoom ) * scale;
    const viewportY = ( -pan.y / zoom ) * scale;

    return (
        <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 120,
            height: 80,
            background: '#fff',
            borderRadius: 4,
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
        }}>
            { nodes.map( node => (
                <div
                    key={ node.id }
                    style={{
                        position: 'absolute',
                        left: node.position.x * scale,
                        top: node.position.y * scale,
                        width: NODE_WIDTH * scale,
                        height: DEFAULT_NODE_HEIGHT * scale,
                        background: typeColors[ node.type ] || '#666',
                        borderRadius: 1,
                        opacity: 0.7,
                    }}
                />
            ))}
            <div style={{
                position: 'absolute',
                left: viewportX,
                top: viewportY,
                width: viewportWidth,
                height: viewportHeight,
                border: '1px solid #0d99ff',
                background: 'rgba(13,153,255,0.1)',
            }} />
        </div>
    );
};

/**
 * Main Canvas component.
 */
const FlowCanvas = () => {
    const { pages, templates, templateParts, patterns, positions, loading, error } = useSiteData();
    const containerRef = useRef( null );
    const [ pan, setPan ] = useState({ x: 100, y: 80 });
    const [ zoom, setZoom ] = useState( 0.55 );
    const [ isPanning, setIsPanning ] = useState( false );
    const [ draggingNode, setDraggingNode ] = useState( null );
    const [ nodePositions, setNodePositions ] = useState({});
    const [ statusFilter, setStatusFilter ] = useState( 'all' ); // all, publish, draft
    const [ containerSize, setContainerSize ] = useState({ width: 800, height: 600 });
    const [ isAnimating, setIsAnimating ] = useState( false );
    const [ hiddenTypes, setHiddenTypes ] = useState( new Set() ); // Types to hide
    const lastMouseRef = useRef({ x: 0, y: 0 });

    // Track container size
    useEffect( () => {
        const updateSize = () => {
            if ( containerRef.current ) {
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };
        updateSize();
        window.addEventListener( 'resize', updateSize );
        return () => window.removeEventListener( 'resize', updateSize );
    }, [] );

    // Build nodes and edges
    const limitedPatterns = ( patterns || [] ).slice( 0, 12 );
    const baseNodes = loading ? [] : buildNodes({
        pages: pages || [],
        templates: templates || [],
        templateParts: templateParts || [],
        patterns: limitedPatterns,
        positions: positions || {}
    });

    // Apply local position overrides and filters
    const nodes = baseNodes
        .filter( node => {
            // Hide by type
            if ( hiddenTypes.has( node.type ) ) return false;
            // Status filter (pages only)
            if ( statusFilter === 'all' ) return true;
            if ( node.type !== 'page' ) return true;
            return node.data.status === statusFilter;
        })
        .map( node => ({
            ...node,
            position: nodePositions[ node.id ] || node.position,
        }));

    const edges = loading ? [] : (() => {
        const { edges: rawEdges } = buildRelationshipGraph({
            pages: pages || [],
            templateParts: templateParts || [],
            patterns: limitedPatterns,
        });
        console.log( '🔗 Edges built:', rawEdges.length, rawEdges );
        return rawEdges;
    })();

    // Pan handlers
    const handleMouseDown = useCallback( ( e ) => {
        if ( e.target === containerRef.current || e.target.classList.contains( 'canvas-bg' ) ) {
            setIsPanning( true );
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [] );

    const handleMouseMove = useCallback( ( e ) => {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };

        if ( isPanning ) {
            setPan( p => ({ x: p.x + dx, y: p.y + dy }) );
        } else if ( draggingNode ) {
            setNodePositions( prev => ({
                ...prev,
                [ draggingNode ]: {
                    x: ( prev[ draggingNode ]?.x || nodes.find( n => n.id === draggingNode )?.position.x || 0 ) + dx / zoom,
                    y: ( prev[ draggingNode ]?.y || nodes.find( n => n.id === draggingNode )?.position.y || 0 ) + dy / zoom,
                },
            }));
        }
    }, [ isPanning, draggingNode, zoom, nodes ] );

    const handleMouseUp = useCallback( () => {
        if ( draggingNode ) {
            // Save positions
            const allPositions = {};
            nodes.forEach( n => {
                allPositions[ n.id ] = nodePositions[ n.id ] || n.position;
            });
            saveNodePositions( allPositions );
        }
        setIsPanning( false );
        setDraggingNode( null );
    }, [ draggingNode, nodes, nodePositions ] );

    // Figma-style: two-finger scroll = pan, pinch/ctrl+scroll = zoom
    const handleWheel = useCallback( ( e ) => {
        e.preventDefault();

        // Pinch gesture or Ctrl+scroll = zoom
        if ( e.ctrlKey || e.metaKey ) {
            const rect = containerRef.current?.getBoundingClientRect();
            if ( ! rect ) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Pinch gestures use smaller delta values, so adjust sensitivity
            const delta = -e.deltaY;
            const zoomFactor = 1 + delta * 0.01;
            const newZoom = Math.min( 3, Math.max( 0.1, zoom * zoomFactor ) );
            const scale = newZoom / zoom;

            setPan({
                x: mouseX - ( mouseX - pan.x ) * scale,
                y: mouseY - ( mouseY - pan.y ) * scale,
            });
            setZoom( newZoom );
        } else {
            // Two-finger scroll = pan
            setPan( p => ({
                x: p.x - e.deltaX,
                y: p.y - e.deltaY,
            }));
        }
    }, [ zoom, pan ] );

    // Node drag handlers
    const handleNodeDragStart = useCallback( ( nodeId, e ) => {
        setDraggingNode( nodeId );
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }, [] );

    const handleNodeDoubleClick = useCallback( ( editUrl ) => {
        if ( editUrl ) window.location.href = editUrl;
    }, [] );

    // Toggle type visibility
    const toggleType = useCallback( ( type ) => {
        setHiddenTypes( prev => {
            const next = new Set( prev );
            if ( next.has( type ) ) {
                next.delete( type );
            } else {
                next.add( type );
            }
            return next;
        });
    }, [] );

    // Reset to default layout (with animation)
    const handleReset = useCallback( () => {
        setIsAnimating( true );
        setNodePositions({});
        saveNodePositions({});
        setPan({ x: 100, y: 80 });
        setZoom( 0.5 );
        setTimeout( () => setIsAnimating( false ), 600 );
    }, [] );

    // Organize nodes using force-directed layout
    const handleOrganize = useCallback( () => {
        if ( ! nodes.length ) return;

        const newPositions = organizeLayout( nodes );

        // Validate positions before applying
        const validPositions = {};
        let hasValid = false;
        Object.keys( newPositions ).forEach( id => {
            const pos = newPositions[ id ];
            if ( pos && isFinite( pos.x ) && isFinite( pos.y ) ) {
                validPositions[ id ] = pos;
                hasValid = true;
            }
        });

        if ( hasValid ) {
            setIsAnimating( true );
            setNodePositions( validPositions );
            saveNodePositions( validPositions );
            setPan({ x: 100, y: 80 });
            setZoom( 0.5 );
            // Turn off animation after transition completes
            setTimeout( () => setIsAnimating( false ), 600 );
        }
    }, [ nodes, edges ] );

    return (
        <div
            ref={ containerRef }
            className="flow-canvas"
            style={{
                position: 'absolute',
                inset: 0,
                background: '#f5f5f5',
                overflow: 'hidden',
                cursor: loading ? 'default' : ( draggingNode ? 'grabbing' : isPanning ? 'grabbing' : 'grab' ),
            }}
            onMouseDown={ loading ? undefined : handleMouseDown }
            onMouseMove={ loading ? undefined : handleMouseMove }
            onMouseUp={ loading ? undefined : handleMouseUp }
            onMouseLeave={ loading ? undefined : handleMouseUp }
            onWheel={ loading ? undefined : handleWheel }
        >
            { loading ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#5c5c5c',
                    fontSize: 13,
                }}>
                    Loading...
                </div>
            ) : (
                <>
                    {/* Clean canvas background */}
                    <div className="canvas-bg" style={{
                        position: 'absolute', inset: 0,
                    }} />

                    {/* Connections */}
                    <Connections nodes={ nodes } edges={ edges } pan={ pan } zoom={ zoom } />

                    {/* Nodes */}
                    <div style={{
                        position: 'absolute',
                        transform: `translate(${ pan.x }px, ${ pan.y }px) scale(${ zoom })`,
                        transformOrigin: '0 0',
                    }}>
                        { nodes.map( node => (
                            <FlowNode
                                key={ node.id }
                                node={ node }
                                onDoubleClick={ handleNodeDoubleClick }
                                onDragStart={ handleNodeDragStart }
                                isDragging={ draggingNode === node.id }
                                isAnimating={ isAnimating }
                            />
                        ))}
                    </div>

                    {/* Top filter bar */}
                    <div style={{
                        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: '#fff', borderRadius: 6,
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        padding: 4,
                    }}>
                        { [ 'all', 'publish', 'draft' ].map( status => (
                            <button
                                key={ status }
                                onClick={ () => setStatusFilter( status ) }
                                style={{
                                    padding: '4px 12px',
                                    background: statusFilter === status ? '#007cba' : 'transparent',
                                    color: statusFilter === status ? '#fff' : '#666',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                }}
                            >
                                { status === 'all' ? 'All' : status === 'publish' ? 'Published' : 'Drafts' }
                            </button>
                        ))}
                        <div style={{ width: 1, height: 20, background: '#e0e0e0', margin: '0 4px' }} />
                        <button
                            onClick={ handleOrganize }
                            style={{
                                padding: '4px 12px',
                                background: 'transparent',
                                color: '#666',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                            onMouseEnter={ e => e.currentTarget.style.background = '#f0f0f0' }
                            onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
                        >
                            Organize
                        </button>
                        <button
                            onClick={ handleReset }
                            style={{
                                padding: '4px 12px',
                                background: 'transparent',
                                color: '#666',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                            onMouseEnter={ e => e.currentTarget.style.background = '#f0f0f0' }
                            onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
                        >
                            Reset
                        </button>
                    </div>

                    {/* Bottom zoom toolbar */}
                    <div style={{
                        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', alignItems: 'center', gap: 1,
                        background: '#fff', borderRadius: 6,
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        padding: 2,
                    }}>
                        <button
                            onClick={ () => setZoom( z => Math.max( 0.1, z * 0.8 ) ) }
                            style={{
                                width: 28, height: 28, background: 'transparent', border: 'none',
                                borderRadius: 4, color: '#666', cursor: 'pointer', fontSize: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={ e => e.currentTarget.style.background = '#f0f0f0' }
                            onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
                        >−</button>
                        <div style={{
                            padding: '4px 8px',
                            color: '#666',
                            fontSize: 11,
                            minWidth: 44,
                            textAlign: 'center',
                            cursor: 'pointer',
                        }}
                            onClick={ () => { setPan({ x: 100, y: 80 }); setZoom( 0.5 ); }}
                        >
                            { Math.round( zoom * 100 ) }%
                        </div>
                        <button
                            onClick={ () => setZoom( z => Math.min( 2, z * 1.25 ) ) }
                            style={{
                                width: 28, height: 28, background: 'transparent', border: 'none',
                                borderRadius: 4, color: '#666', cursor: 'pointer', fontSize: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={ e => e.currentTarget.style.background = '#f0f0f0' }
                            onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
                        >+</button>
                    </div>

{/* Legend / Type Filter */}
                    <div style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        display: 'flex',
                        gap: 8,
                        background: '#fff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: 11,
                    }}>
                        { [
                            { type: 'page', label: 'Pages', color: '#4ab866' },
                            { type: 'templatePart', label: 'Template Parts', color: '#3498db' },
                            { type: 'pattern', label: 'Patterns', color: '#9b59b6' },
                        ].map( ({ type, label, color }) => {
                            const isHidden = hiddenTypes.has( type );
                            return (
                                <button
                                    key={ type }
                                    onClick={ () => toggleType( type ) }
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '4px 8px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        color: isHidden ? '#999' : '#666',
                                        opacity: isHidden ? 0.6 : 1,
                                    }}
                                    onMouseEnter={ e => e.currentTarget.style.background = '#f5f5f5' }
                                    onMouseLeave={ e => e.currentTarget.style.background = 'transparent' }
                                >
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: isHidden ? 'transparent' : color,
                                        border: `2px solid ${ color }`,
                                    }} />
                                    <span>{ label }</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default FlowCanvas;
