import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { colorDiagramNodes, diagramTheme } from './diagramTheme';

let mermaidPromise = null;
let renderCount = 0;
let renderQueue = Promise.resolve();
const MIN_READABLE_WIDTH = 800;

// Separate chunk, fetched only by pages that actually contain a diagram.
const loadMermaid = () => {
    mermaidPromise ??= import('mermaid').then((module) => module.default);
    mermaidPromise.catch(() => { mermaidPromise = null; });
    return mermaidPromise;
};

const Figure = styled.figure`
  margin: 1.25rem 0;
  min-height: ${({ $pending }) => ($pending ? '12rem' : '0')};
  border: 1px solid ${({ theme }) => theme.colors.borderLight};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;

  .diagram { padding: 1rem; }

  svg {
    display: block;
    margin: 0 auto;
    max-width: 100%;
    height: auto;
  }
`;

const Status = styled.p`
  margin: 0;
  padding: 1rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Fallback = styled.pre`
  margin: 0 !important;
  border-radius: 0 0 10px 10px !important;
`;

/**
 * Renders a Mermaid fence to SVG. Mermaid runs with `securityLevel: 'strict'`
 * (sanitized labels, no click handlers); if a diagram fails to parse the
 * source is shown instead, so a broken diagram never hides content.
 */
function MermaidDiagram({ source, label = 'Diagram' }) {
    const dark = useSelector((state) => state.theme?.isDarkModeEnabled);
    const [state, setState] = useState({ status: 'loading' });
    const diagramRef = useRef(null);

    // Wide diagrams keep a readable floor and scroll sideways on phones
    // instead of shrinking to illegible text.
    useLayoutEffect(() => {
        const svg = diagramRef.current?.querySelector('svg');
        const width = svg?.viewBox?.baseVal?.width;
        if (svg && width) svg.style.minWidth = `${Math.min(width, MIN_READABLE_WIDTH)}px`;
    }, [state]);

    useEffect(() => {
        let cancelled = false;
        const id = `sd-mermaid-${(renderCount += 1)}`;
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }));

        loadMermaid()
            .then((mermaid) => {
                const render = renderQueue.then(async () => {
                    if (cancelled) return;
                    // Initialization is global in Mermaid; keep it paired with its render.
                    mermaid.initialize(diagramTheme(dark));
                    const { svg } = await mermaid.render(id, source);
                    if (!cancelled) setState({ status: 'ready', svg: colorDiagramNodes(svg, document) });
                });
                // Recover the queue, while the component's catch still shows the error.
                renderQueue = render.catch(() => {});
                return render;
            })
            .catch((error) => {
                if (!cancelled) setState({ status: 'error', message: error?.message || String(error) });
            })
            .finally(() => {
                // Mermaid measures in a scratch node it may leave behind on failure.
                document.getElementById(id)?.remove();
                document.getElementById(`d${id}`)?.remove();
            });

        return () => { cancelled = true; };
    }, [source, dark]);

    if (state.status === 'error') {
        return (
            <Figure>
                <Status role="note">Diagram could not be rendered; showing its source.</Status>
                <Fallback><code className="language-mermaid">{source}</code></Fallback>
            </Figure>
        );
    }

    return (
        <Figure $pending={state.status === 'loading'} tabIndex={0} aria-busy={state.status === 'loading'}>
            {state.status === 'loading'
                ? <Status>Loading diagram…</Status>
                : (
                    <div
                        ref={diagramRef}
                        className="diagram"
                        role="img"
                        aria-label={label}
                        // Mermaid output in strict mode is DOMPurify-sanitized.
                        dangerouslySetInnerHTML={{ __html: state.svg }}
                    />
                )}
        </Figure>
    );
}

export default MermaidDiagram;
