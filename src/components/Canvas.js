/**
 * Flow Editor Canvas - React Flow wrapper.
 */
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Canvas.scss';

// Placeholder nodes for testing.
const initialNodes = [
    {
        id: 'pattern-1',
        type: 'default',
        position: { x: 50, y: 100 },
        data: { label: 'Header (pattern)' },
    },
    {
        id: 'page-1',
        type: 'default',
        position: { x: 350, y: 50 },
        data: { label: 'Home' },
    },
    {
        id: 'page-2',
        type: 'default',
        position: { x: 350, y: 200 },
        data: { label: 'About' },
    },
];

const initialEdges = [
    { id: 'e1', source: 'pattern-1', target: 'page-1', animated: true },
    { id: 'e2', source: 'pattern-1', target: 'page-2', animated: true },
];

const Canvas = () => {
    const [ nodes, setNodes, onNodesChange ] = useNodesState( initialNodes );
    const [ edges, setEdges, onEdgesChange ] = useEdgesState( initialEdges );

    return (
        <div className="flow-editor-canvas">
            <ReactFlow
                nodes={ nodes }
                edges={ edges }
                onNodesChange={ onNodesChange }
                onEdgesChange={ onEdgesChange }
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
