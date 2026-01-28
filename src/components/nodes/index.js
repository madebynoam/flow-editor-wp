/**
 * Custom node types for React Flow.
 */
import PageNode from './PageNode';
import PatternNode from './PatternNode';
import TemplatePartNode from './TemplatePartNode';

export const nodeTypes = {
    page: PageNode,
    pattern: PatternNode,
    templatePart: TemplatePartNode,
};

export { PageNode, PatternNode, TemplatePartNode };
