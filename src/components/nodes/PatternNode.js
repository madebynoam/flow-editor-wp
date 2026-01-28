/**
 * PatternNode - Custom node for patterns.
 */
import { Handle, Position } from '@xyflow/react';
import NodePreview from './NodePreview';

const PatternNode = ({ data, selected }) => {
    const { title, content } = data;

    return (
        <div
            className={ `flow-node flow-node-pattern ${ selected ? 'selected' : '' }` }
        >
            <Handle type="target" position={ Position.Left } />

            <div className="flow-node-header">
                <span className="flow-node-type">Pattern</span>
                <span className="flow-node-title">{ title }</span>
            </div>

            <div className="flow-node-preview">
                <NodePreview content={ content } viewportWidth={ 400 } />
            </div>

            <Handle type="source" position={ Position.Right } />
        </div>
    );
};

export default PatternNode;
