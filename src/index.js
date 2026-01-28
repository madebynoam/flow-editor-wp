/**
 * Flow Editor - Main entry point.
 */
import { createRoot } from '@wordpress/element';
import Canvas from './components/Canvas';
import './index.scss';

const App = () => {
    return (
        <div className="flow-editor-app">
            <header className="flow-editor-header">
                <h1>Flow Editor</h1>
                <a
                    href={ window.flowEditorData?.siteEditor || '#' }
                    className="flow-editor-back-link"
                >
                    &larr; Site Editor
                </a>
            </header>
            <Canvas />
        </div>
    );
};

// Mount the app.
document.addEventListener( 'DOMContentLoaded', () => {
    const container = document.getElementById( 'flow-editor-root' );
    if ( container ) {
        const root = createRoot( container );
        root.render( <App /> );
    }
});
