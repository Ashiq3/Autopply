import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { GITHUB_OPEN_SOURCE_TOOLS } from '../data/defaults';

export const GithubToolsHub: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Full Automation', 'CV Tailoring', 'Web Scraping'];

  const filteredTools = GITHUB_OPEN_SOURCE_TOOLS.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  const handleCopyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Open-Source Ecosystem</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Companion open-source CLI scrapers, ATS matchers, and resume builders on GitHub.
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start sm:self-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTools.map((tool) => (
          <article
            key={tool.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 truncate">{tool.name}</h2>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                    {tool.repo} · {tool.category}
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 tabular-nums shrink-0">
                  {tool.stars.toLocaleString()} stars
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{tool.description}</p>

              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside pt-1 border-t border-zinc-100 dark:border-zinc-800">
                {tool.features.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>

              <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">CLI Quickstart</span>
                  <button
                    onClick={() => handleCopyCommand(tool.id, tool.pythonCommand)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {copiedId === tool.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap overflow-x-auto">
                  {tool.pythonCommand}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[65%]">{tool.architectureNotes}</span>
              <a
                href={tool.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
