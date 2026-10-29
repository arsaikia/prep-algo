import React, { useEffect, useMemo, useRef, useState } from 'react';

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
    BookOpen, ChevronDown, ChevronRight, Layers, Menu, X,
} from 'react-feather';

import useCurriculum from '../../content/useCurriculum';
import { contentUrl } from '../../utils/navigation';

const Shell = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const Sidebar = styled.nav`
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  overflow-y: auto;
  padding: 1.25rem 0 3rem;

  /*
   * Below the split point the sidebar becomes a drawer rather than a column.
   * A 300px pane beside a prose column does not fit a phone, and collapsing
   * it into an accordion above the article buries the article.
   */
  @media (max-width: 900px) {
    visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1200;
    width: min(320px, 85vw);
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.22s ease;
    box-shadow: ${({ $open }) => ($open ? '0 0 40px rgba(0, 0, 0, 0.35)' : 'none')};
  }
`;

const Scrim = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.45);
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 1.1rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 0.75rem;
`;

const SidebarTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
`;

const CloseDrawer = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 0.2rem;

  @media (max-width: 900px) { display: inline-flex; }
`;

const ModuleBlock = styled.div`
  margin-bottom: 0.35rem;
`;

const ModuleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:hover { color: ${({ theme }) => theme.colors.primary}; }

  svg { flex-shrink: 0; }
`;

const ModuleCount = styled.span`
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TopicList = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 0.4rem;
`;

const TopicLink = styled(NavLink)`
  display: block;
  padding: 0.45rem 1.1rem 0.45rem 2.15rem;
  font-size: 0.88rem;
  line-height: 1.35;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-left: 2px solid transparent;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.backgroundTertiary};
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    border-left-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    font-weight: 600;
  }
`;

const EmptyModule = styled.p`
  margin: 0;
  padding: 0.3rem 1.1rem 0.7rem 2.15rem;
  font-size: 0.8rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.75;
`;

const Reader = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
`;

const MobileBar = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    position: sticky;
    top: 0;
    z-index: 5;
  }
`;

const MobileBarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.85rem;
`;

const SidebarMessage = styled.p`
  padding: 0 1.1rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/**
 * The System Design shell: a persistent module → topic outline beside a
 * reader pane.
 *
 * Reading a curriculum is navigation-heavy — you jump from a concept to the
 * case study that applies it and back again. The previous shape made every
 * jump a round trip through a card grid, which loses your place in the
 * syllabus. The sidebar stays mounted across route changes, so the outline is
 * always visible and the reader scrolls independently of it.
 */
function SystemDesignLayout() {
    const { pathname } = useLocation();
    const { status, modules, quizByTopic, error, retry } = useCurriculum();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
    const drawerRef = useRef(null);
    const openerRef = useRef(null);
    const readerRef = useRef(null);
    const close = () => setDrawerOpen(false);
    useEffect(() => {
      const media = window.matchMedia('(max-width: 900px)');
      const update = () => { setMobile(media.matches); if (!media.matches) setDrawerOpen(false); };
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }, []);
    useEffect(() => { setDrawerOpen(false); readerRef.current?.scrollTo(0, 0); }, [pathname]);
    useEffect(() => {
      if (!drawerOpen || !mobile) return undefined;
      const drawer = drawerRef.current;
      drawer.querySelector('button')?.focus();
      const keydown = (event) => {
        if (event.key === 'Escape') { event.preventDefault(); setDrawerOpen(false); }
        if (event.key !== 'Tab') return;
        const nodes = [...drawer.querySelectorAll('button, a[href]')];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      };
      document.addEventListener('keydown', keydown);
      return () => { document.removeEventListener('keydown', keydown); openerRef.current?.focus(); };
    }, [drawerOpen, mobile]);
    // Explicit user overrides only. Absence means "use the default", which
    // depends on which topic is open — so this cannot be seeded up front.
    const [overrides, setOverrides] = useState({});

    // Read from the path rather than useParams: this is the parent of the
    // `:slug` route, and a layout route only sees params matched at its own
    // level or above.
    const slug = pathname.split('/')[2] || null;

    const activeModule = useMemo(
        () => modules.find((module) => module.topics.some((t) => t.slug === slug))?.slug ?? null,
        [slug, modules],
    );

    // Expand only the module holding the open topic. Expanding everything
    // turns the outline into a wall; expanding nothing hides where you are.
    const isOpen = (module) => (
        module.slug in overrides
            ? overrides[module.slug]
            : activeModule === null || module.slug === activeModule
    );

    const toggle = (module) => setOverrides((prev) => ({
        ...prev,
        [module.slug]: !isOpen(module),
    }));

    return (
        <Shell>
            <Scrim $open={drawerOpen} onClick={close} />

            <Sidebar id="curriculum-contents" ref={drawerRef} $open={drawerOpen}
              aria-label="System Design contents" role={mobile && drawerOpen ? 'dialog' : 'navigation'}
              aria-modal={mobile && drawerOpen ? true : undefined}
              aria-hidden={mobile && !drawerOpen ? true : undefined}
              inert={mobile && !drawerOpen ? '' : undefined}>
                <SidebarHeader>
                    <SidebarTitle>
                        <Layers size={16} />
                        System Design
                    </SidebarTitle>
                    <CloseDrawer onClick={close} aria-label="Close contents">
                        <X size={18} />
                    </CloseDrawer>
                </SidebarHeader>

                {status === 'loading' && <SidebarMessage>Loading curriculum…</SidebarMessage>}
                {status === 'error' && (
                    <SidebarMessage>Could not load the curriculum: {error} <button onClick={retry}>Retry curriculum</button></SidebarMessage>
                )}

                {status === 'ready' && modules.map((module) => {
                    const open = isOpen(module);
                    return (
                        <ModuleBlock key={module.slug}>
                            <ModuleButton onClick={() => toggle(module)} aria-expanded={open}>
                                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {module.title}
                                <ModuleCount>{module.topics.length || '—'}</ModuleCount>
                            </ModuleButton>

                            {open && (
                                <TopicList>
                                    {module.topics.map((topic) => (
                                        <TopicLink
                                            key={topic.slug}
                                            to={contentUrl(topic)}
                                            onClick={() => setDrawerOpen(false)}
                                        >
                                            {topic.title}
                                        </TopicLink>
                                    ))}
                                    {module.topics.length === 0 && (
                                        <EmptyModule>Not written yet</EmptyModule>
                                    )}
                                </TopicList>
                            )}
                        </ModuleBlock>
                    );
                })}
            </Sidebar>

            <Reader ref={readerRef} inert={mobile && drawerOpen ? '' : undefined}>
                <MobileBar>
                    <MobileBarButton ref={openerRef} aria-expanded={drawerOpen} aria-controls="curriculum-contents" onClick={() => setDrawerOpen(true)}>
                        <Menu size={15} />
                        Contents
                    </MobileBarButton>
                    <SidebarTitle><BookOpen size={15} /> System Design</SidebarTitle>
                </MobileBar>

                <Outlet context={{ modules, quizByTopic, status }} />
            </Reader>
        </Shell>
    );
}

export default SystemDesignLayout;
