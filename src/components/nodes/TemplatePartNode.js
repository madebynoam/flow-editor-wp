/**
 * TemplatePartNode - Custom node for template parts.
 */
import { Handle, Position } from '@xyflow/react';
import NodePreview from './NodePreview';

const TemplatePartNode = ({ data, selected }) => {
    const { title, content, area, editUrl } = data;

    const handleDoubleClick = () => {
        if ( editUrl ) {
            window.location.href = editUrl;
        }
    };

    return (
        <div
            className={ `flow-node flow-node-template-part ${ selected ? 'selected' : '' }` }
            onDoubleClick={ handleDoubleClick }
        >
            <Handle type="target" position={ Position.Left } />

            <div className="flow-node-header">
                <span className="flow-node-type">{ area || 'Template Part' }</span>
                <span className="flow-node-title">{ title }</span>
            </div>

            <div className="flow-node-preview">
                <NodePreview content={ content } viewportWidth={ 400 } />
            </div>

            <Handle type="source" position={ Position.Right } />
        </div>
    );
};

export default TemplatePartNode;
