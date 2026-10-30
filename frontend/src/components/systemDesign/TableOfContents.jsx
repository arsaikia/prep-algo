import React, { useState } from 'react';
import styled from 'styled-components';

const Toc = styled.details`
  margin: 0 0 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};

  summary {
    cursor: pointer;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  summary span { margin-left: 0.4rem; }
  summary:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; outline-offset: 2px; }

  ol {
    list-style: none;
    margin: 0;
    padding: 0 1rem 0.85rem;
    columns: 2 16rem;
    column-gap: 1.5rem;
  }

  li { margin: 0 0 0.35rem; break-inside: avoid; font-size: 0.9rem; line-height: 1.4; }
  li.depth-3 { padding-left: 1rem; font-size: 0.85rem; }

  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  a:hover, a:focus-visible { color: ${({ theme }) => theme.colors.primary}; }
`;

const DESKTOP = '(min-width: 901px)';

/** On-page contents for long lessons; collapsed by default on phones. */
function TableOfContents({ headings }) {
    const [open, setOpen] = useState(() => (
        typeof window === 'undefined' || !window.matchMedia || window.matchMedia(DESKTOP).matches
    ));

    const jump = (event, id) => {
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(window.history.state, '', `#${id}`);
        if (!window.matchMedia?.(DESKTOP).matches) setOpen(false);
    };

    return (
        <Toc open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary><span>On this page</span></summary>
            <nav aria-label="On this page">
                <ol>
                    {headings.map((heading) => (
                        <li key={heading.id} className={`depth-${heading.depth}`}>
                            <a href={`#${heading.id}`} onClick={(event) => jump(event, heading.id)}>{heading.text}</a>
                        </li>
                    ))}
                </ol>
            </nav>
        </Toc>
    );
}

export default TableOfContents;
