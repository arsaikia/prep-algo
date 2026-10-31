// Pastel fills stay light in both modes; labels use dark ink, not the page text color.
export const PASTEL_NODES = [
    { fill: '#e5defa', border: '#78639f' },
    { fill: '#d5ece4', border: '#547b70' },
    { fill: '#dceafa', border: '#5c789b' },
    { fill: '#fae5d5', border: '#9b7256' },
    { fill: '#f5dfe9', border: '#97657b' },
    { fill: '#f3edcf', border: '#8a7b49' },
];
export const DIAGRAM_INK = '#243247';

export function diagramTheme(dark) {
    const line = dark ? '#b7c5d8' : '#596b82';
    const surface = dark ? '#273244' : '#f3f5fa';
    const text = dark ? '#e5ebf5' : DIAGRAM_INK;
    return {
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'base',
        fontFamily: 'inherit',
        themeCSS: `
            .edgeLabel, .edgeLabel p, .edgeLabel span,
            .cluster-label, .cluster-label p, .cluster-label span { color: ${text} !important; }
            .edgeLabel text, .cluster-label text { fill: ${text} !important; }
        `,
        themeVariables: {
            darkMode: false,
            background: dark ? '#222831' : '#ffffff',
            primaryColor: PASTEL_NODES[0].fill,
            primaryBorderColor: PASTEL_NODES[0].border,
            primaryTextColor: DIAGRAM_INK,
            secondaryColor: PASTEL_NODES[1].fill,
            secondaryBorderColor: PASTEL_NODES[1].border,
            secondaryTextColor: DIAGRAM_INK,
            tertiaryColor: PASTEL_NODES[2].fill,
            tertiaryBorderColor: PASTEL_NODES[2].border,
            tertiaryTextColor: DIAGRAM_INK,
            lineColor: line,
            textColor: text,
            nodeTextColor: DIAGRAM_INK,
            edgeLabelBackground: surface,
            clusterBkg: dark ? '#2b3545' : '#f0f3f8',
            clusterBorder: dark ? '#8999af' : '#8492a8',
            titleColor: text,
            actorBkg: PASTEL_NODES[2].fill,
            actorBorder: PASTEL_NODES[2].border,
            actorTextColor: DIAGRAM_INK,
            actorLineColor: line,
            signalColor: line,
            signalTextColor: text,
            labelBoxBkgColor: PASTEL_NODES[0].fill,
            labelBoxBorderColor: PASTEL_NODES[0].border,
            labelTextColor: DIAGRAM_INK,
            loopTextColor: text,
            activationBkgColor: PASTEL_NODES[1].fill,
            activationBorderColor: PASTEL_NODES[1].border,
            noteBkgColor: PASTEL_NODES[5].fill,
            noteBorderColor: PASTEL_NODES[5].border,
            noteTextColor: DIAGRAM_INK,
            stateBkg: PASTEL_NODES[0].fill,
            stateLabelColor: DIAGRAM_INK,
            stateBorder: PASTEL_NODES[0].border,
            transitionColor: line,
            transitionLabelColor: text,
        },
    };
}

/** Cycle only default flowchart nodes; keep authored classes and status colors intact. */
export function colorDiagramNodes(svg, document) {
    const template = document.createElement('template');
    template.innerHTML = svg;
    template.content.querySelectorAll('g.node.default').forEach((node, index) => {
        const color = PASTEL_NODES[index % PASTEL_NODES.length];
        node.querySelectorAll('.label-container').forEach((shape) => {
            if (shape.getAttribute('style')) return;
            shape.style.fill = color.fill;
            shape.style.stroke = color.border;
        });
    });
    return template.innerHTML;
}
