/**
 * Flow Editor - Gutenberg editor integration.
 * Adds toolbar button next to List View.
 */
import { registerPlugin } from '@wordpress/plugins';
import { useState, createPortal, useEffect, useCallback } from '@wordpress/element';
import { Button, Tooltip } from '@wordpress/components';
import FlowCanvas from './components/FlowCanvas';
import './index.scss';

/**
 * Flow Editor Plugin - Toolbar button with fullscreen canvas.
 */
const FlowEditorPlugin = () => {
    const [ isOpen, setIsOpen ] = useState( false );
    const [ isVisible, setIsVisible ] = useState( false );
    const [ toolbarContainer, setToolbarContainer ] = useState( null );

    const handleClose = useCallback( () => {
        setIsVisible( false );
        setTimeout( () => setIsOpen( false ), 200 ); // Wait for fade out
    }, [] );

    // Trigger fade in after mount
    useEffect( () => {
        if ( isOpen ) {
            requestAnimationFrame( () => setIsVisible( true ) );
        }
    }, [ isOpen ] );

    // Find toolbar container to inject button
    useEffect( () => {
        const findToolbar = () => {
            // Try to find the document tools area (where List View button lives)
            const selectors = [
                '.editor-document-tools__left',
                '.edit-post-header-toolbar__left',
                '.editor-document-tools',
                '.edit-post-header-toolbar',
            ];

            for ( const selector of selectors ) {
                const el = document.querySelector( selector );
                if ( el ) {
                    setToolbarContainer( el );
                    return;
                }
            }
        };

        // Try immediately and after a short delay (editor might not be ready)
        findToolbar();
        const timeout = setTimeout( findToolbar, 500 );
        const timeout2 = setTimeout( findToolbar, 1500 );

        return () => {
            clearTimeout( timeout );
            clearTimeout( timeout2 );
        };
    }, [] );

    // Listen for Escape key when open
    useEffect( () => {
        if ( ! isOpen ) return;

        const handleKeyDown = ( e ) => {
            if ( e.key === 'Escape' ) {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
            }
        };

        document.addEventListener( 'keydown', handleKeyDown, true );
        return () => document.removeEventListener( 'keydown', handleKeyDown, true );
    }, [ isOpen, handleClose ] );

    // Toolbar button
    const toolbarButton = toolbarContainer && createPortal(
        <Tooltip text="Flow View">
            <Button
                className="flow-editor-toolbar-button"
                icon="screenoptions"
                onClick={ () => setIsOpen( true ) }
                aria-label="Flow View"
                isPressed={ isOpen }
            />
        </Tooltip>,
        toolbarContainer
    );

    return (
        <>
            { toolbarButton }

            { isOpen && createPortal(
                <div className={ `flow-editor-fullscreen ${ isVisible ? 'is-visible' : '' }` }>
                    <button
                        className="flow-editor-close"
                        onClick={ handleClose }
                        aria-label="Close Flow View"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.1 6.3 1 1 6.1-6.3 6.1 6.3 1-1z" fill="currentColor"/></svg>
                    </button>
                    <FlowCanvas />
                </div>,
                document.body
            )}
        </>
    );
};

registerPlugin( 'flow-editor', {
    render: FlowEditorPlugin,
} );
