'use client';

import { useEffect, useState, useRef } from 'react';
import { BookOpenIcon, ArrowLeftIcon, Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

export default function DocsPage() {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        primaryColor: '#f97316',
        primaryTextColor: '#fff',
        primaryBorderColor: '#f97316',
        lineColor: '#60a5fa',
        secondaryColor: '#3b82f6',
        tertiaryColor: '#8b5cf6',
        background: '#1f2937',
        mainBkg: '#111827',
        secondBkg: '#1f2937',
        textColor: '#e5e7eb',
        fontSize: '14px'
      }
    });

    fetch('/docs/MIXER_ARCHITECTURE.md')
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        extractToc(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load documentation:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Render Mermaid diagrams after content loads
    if (!loading && contentRef.current) {
      const renderMermaid = async () => {
        try {
          // Clear any previous mermaid SVGs
          const mermaidDivs = contentRef.current?.querySelectorAll('.mermaid');
          mermaidDivs?.forEach((div) => {
            // Reset to original code if it was already rendered
            if (div.getAttribute('data-processed') === 'true') {
              const originalCode = div.getAttribute('data-original-code');
              if (originalCode) {
                div.textContent = originalCode;
                div.removeAttribute('data-processed');
              }
            }
          });

          await mermaid.run({
            querySelector: '.mermaid',
            suppressErrors: true
          });
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          // Display error in the diagram container
          const mermaidDivs = contentRef.current?.querySelectorAll('.mermaid');
          mermaidDivs?.forEach((div) => {
            if (!div.querySelector('svg')) {
              div.innerHTML = `
                <div class="text-red-400 p-4 bg-red-900/20 rounded">
                  <p class="font-semibold">Diagram rendering error</p>
                  <p class="text-sm mt-1">Failed to render Mermaid diagram</p>
                </div>
              `;
            }
          });
        }
      };

      // Delay to ensure DOM is ready
      setTimeout(renderMermaid, 100);
    }
  }, [loading, markdown]);

  useEffect(() => {
    // Setup scroll spy for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -35% 0px' }
    );

    const headings = document.querySelectorAll('h2[id], h3[id]');
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [loading]);

  const extractToc = (text: string) => {
    const lines = text.split('\n');
    const tocItems: TocItem[] = [];
    let currentH2: TocItem | null = null;
    
    lines.forEach((line) => {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);
      
      if (h2Match) {
        const text = h2Match[1];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        currentH2 = { id, text, level: 2, children: [] };
        tocItems.push(currentH2);
      } else if (h3Match && currentH2) {
        const text = h3Match[1];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        currentH2.children!.push({ id, text, level: 3 });
      }
    });
    
    // Initialize all H2 sections as collapsed
    setExpandedSections(new Set());
    
    setToc(tocItems);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Set active section immediately when clicked
      setActiveSection(id);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background Grid */}
      <div
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <BookOpenIcon className="w-7 h-7 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-white">Architecture Docs</h1>
                <p className="text-xs text-gray-400 hidden sm:block">SLPM Privacy Mixer</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar Table of Contents */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:sticky top-20 left-0 z-40 w-64 h-[calc(100vh-5rem)] overflow-y-auto bg-gray-900 lg:bg-transparent border-r border-gray-800 lg:border-0 transition-transform duration-300 p-4 lg:p-0`}
        >
          <div className="sticky top-0 bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Table of Contents
            </h2>
            <nav className="space-y-1">
              {toc.map((item) => (
                <div key={item.id}>
                  {/* H2 Section - Always visible with collapse toggle */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSection(item.id)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                      aria-label={expandedSections.has(item.id) ? 'Collapse section' : 'Expand section'}
                    >
                      {expandedSections.has(item.id) ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        scrollToSection(item.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === item.id
                          ? 'bg-orange-500/20 text-orange-400 font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {item.text}
                    </button>
                  </div>

                  {/* H3 Subsections - Show only when parent is expanded */}
                  {expandedSections.has(item.id) && item.children && item.children.length > 0 && (
                    <div className="ml-5 space-y-1 mt-1">
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            scrollToSection(child.id);
                            if (window.innerWidth < 1024) setSidebarOpen(false);
                          }}
                          className={`block w-full text-left pl-6 pr-3 py-2 rounded-lg text-sm transition-colors ${
                            activeSection === child.id
                              ? 'bg-orange-500/20 text-orange-400 font-medium'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {child.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:ml-0 ml-0">
          <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                  <p className="text-gray-400">Loading documentation...</p>
                </div>
              </div>
            ) : (
              <div ref={contentRef} className="prose prose-invert max-w-none p-8">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      
                      // Handle Mermaid diagrams
                      if (language === 'mermaid') {
                        const code = String(children).replace(/\n$/, '');
                        return (
                          <div className="not-prose my-8">
                            <div 
                              className="mermaid bg-gray-800/50 rounded-lg p-6 border border-gray-700"
                              data-original-code={code}
                            >
                              {code}
                            </div>
                          </div>
                        );
                      }
                      
                      // Regular code blocks
                      return !inline && match ? (
                        <div className="not-prose my-4">
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                            className="rounded-lg"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="px-1.5 py-0.5 rounded bg-gray-800 text-orange-400 text-sm" {...props}>
                          {children}
                        </code>
                      );
                    },
                    h2({ node, children, ...props }: any) {
                      const text = String(children);
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      return (
                        <h2 id={id} className="text-3xl font-bold text-white mt-12 mb-4 border-b border-gray-700 pb-3" {...props}>
                          {children}
                        </h2>
                      );
                    },
                    h3({ node, children, ...props }: any) {
                      const text = String(children);
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      return (
                        <h3 id={id} className="text-2xl font-semibold text-white mt-8 mb-3" {...props}>
                          {children}
                        </h3>
                      );
                    },
                    h4({ node, children, ...props }: any) {
                      return (
                        <h4 className="text-xl font-semibold text-blue-400 mt-6 mb-2" {...props}>
                          {children}
                        </h4>
                      );
                    },
                    p({ node, children, ...props }: any) {
                      return (
                        <p className="text-gray-300 leading-relaxed mb-4" {...props}>
                          {children}
                        </p>
                      );
                    },
                    ul({ node, children, ...props }: any) {
                      return (
                        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4" {...props}>
                          {children}
                        </ul>
                      );
                    },
                    ol({ node, children, ...props }: any) {
                      return (
                        <ol className="list-decimal list-inside text-gray-300 space-y-2 mb-4 ml-4" {...props}>
                          {children}
                        </ol>
                      );
                    },
                    li({ node, children, ...props }: any) {
                      return (
                        <li className="text-gray-300" {...props}>
                          {children}
                        </li>
                      );
                    },
                    a({ node, children, ...props }: any) {
                      return (
                        <a className="text-blue-400 hover:text-blue-300 underline" {...props}>
                          {children}
                        </a>
                      );
                    },
                    strong({ node, children, ...props }: any) {
                      return (
                        <strong className="font-semibold text-white" {...props}>
                          {children}
                        </strong>
                      );
                    },
                    blockquote({ node, children, ...props }: any) {
                      return (
                        <blockquote className="border-l-4 border-orange-500 pl-4 py-2 my-4 bg-gray-800/30 italic text-gray-400" {...props}>
                          {children}
                        </blockquote>
                      );
                    },
                    table({ node, children, ...props }: any) {
                      return (
                        <div className="overflow-x-auto my-6">
                          <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg" {...props}>
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ node, children, ...props }: any) {
                      return (
                        <thead className="bg-gray-800" {...props}>
                          {children}
                        </thead>
                      );
                    },
                    tbody({ node, children, ...props }: any) {
                      return (
                        <tbody className="divide-y divide-gray-700 bg-gray-900/50" {...props}>
                          {children}
                        </tbody>
                      );
                    },
                    tr({ node, children, ...props }: any) {
                      return (
                        <tr className="hover:bg-gray-800/50 transition-colors" {...props}>
                          {children}
                        </tr>
                      );
                    },
                    th({ node, children, ...props }: any) {
                      return (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" {...props}>
                          {children}
                        </th>
                      );
                    },
                    td({ node, children, ...props }: any) {
                      return (
                        <td className="px-4 py-3 text-sm text-gray-300" {...props}>
                          {children}
                        </td>
                      );
                    }
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
