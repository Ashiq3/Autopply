import React, { useState } from 'react';
import { 
  Github, 
  Terminal, 
  Star, 
  ExternalLink, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  Cpu, 
  BookOpen, 
  Search, 
  Sparkles,
  Bot
} from 'lucide-react';
import { GITHUB_OPEN_SOURCE_TOOLS } from '../data/defaults';
import { GitHubTool } from '../types';

export const GithubToolsHub: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Full Automation', 'Browser Bot', 'CV Tailoring', 'Web Scraping'];

  const filteredTools = GITHUB_OPEN_SOURCE_TOOLS.filter(t => {
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
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              GitHub Open-Source Job Automation Hub
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Curated deep-dive into open-source Python & Node.js AI job applier scripts, scrapers, and resume tailors.
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTools.map((tool) => (
          <div 
            key={tool.id}
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 shadow-xl transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-white hover:text-purple-300 transition-colors">
                      {tool.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{tool.repo}</p>
                </div>

                <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{tool.stars.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                {tool.description}
              </p>

              {/* Key Features List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Key Open Source Features</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-300">
                  {tool.features.map((f, idx) => (
                    <li key={idx} className="flex items-center space-x-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="line-clamp-1">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Architecture Explanation */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs space-y-1">
                <span className="font-bold text-purple-300 flex items-center gap-1 text-[11px]">
                  <Cpu className="w-3.5 h-3.5" /> Under-The-Hood Architecture
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">{tool.architectureNotes}</p>
              </div>

              {/* Terminal Install Commands */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Terminal Commands</span>
                  <button
                    onClick={() => handleCopyCommand(tool.id, tool.pythonCommand)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                  >
                    {copiedId === tool.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto">
                  {tool.pythonCommand}
                </div>
              </div>
            </div>

            {/* GitHub Repo Button */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <a
                href={tool.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 flex items-center space-x-1.5 transition-all"
              >
                <Github className="w-4 h-4" />
                <span>View Repository on GitHub</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
