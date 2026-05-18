import React, { useState, useEffect } from 'react';
import { Play, Square, Loader2, RefreshCw, Eye, History, Image as ImageIcon, Sparkles, AlertCircle, PlusCircle } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export const WorkflowRunner = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectUrl, setNewProjectUrl] = useState<string>('');
  
  const [targetUrl, setTargetUrl] = useState<string>('https://example.com');
  const [goal, setGoal] = useState<string>('Search for products and view details');
  const [persona, setPersona] = useState<string>('Tech-Savvy User');
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  
  // Real-time MCP Context Data
  const [mcpContext, setMcpContext] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'history' | 'screenshots'>('elements');
  const [polling, setPolling] = useState<boolean>(false);

  // Fetch projects on load
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      setProjects(data.projects || []);
      if (data.projects && data.projects.length > 0) {
        setSelectedProjectId(data.projects[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectUrl) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newProjectName, websiteUrl: newProjectUrl }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects([...projects, data.project]);
        setSelectedProjectId(data.project.id);
        setNewProjectName('');
        setNewProjectUrl('');
      }
    } catch (e) {
      console.error('Failed to create project', e);
    }
  };

  // Start Workflow Session
  const handleStartSession = async () => {
    if (!selectedProjectId || !targetUrl) return;
    setLoading(true);
    setSessionStatus('idle');
    try {
      const res = await fetch(`${API_BASE}/workflows/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          url: targetUrl,
          goal,
          persona,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setSessionStatus('running');
        setPolling(true);
      } else {
        setSessionStatus('failed');
      }
    } catch (e) {
      console.error('Failed to start session', e);
      setSessionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  // End Workflow Session
  const handleEndSession = async () => {
    if (!sessionId) return;
    setPolling(false);
    try {
      await fetch(`${API_BASE}/workflows/${sessionId}/end`, { method: 'POST' });
      setSessionStatus('completed');
    } catch (e) {
      console.error('Failed to end session', e);
    }
  };

  // Poll for active context
  useEffect(() => {
    if (!polling || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/workflows/${sessionId}/context`);
        const data = await res.json();
        if (data.context) {
          setMcpContext(data.context);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, sessionId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          MCP Observability & Session Visualizer
        </h1>
        <p className="text-foreground/60 mt-1">
          Monitor exactly how the Model Context Protocol abstracts and simplifies browser interactions in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Configuration & Controls */}
        <div className="space-y-6">
          
          {/* Create Project Quick Action */}
          <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4 shadow-xl shadow-black/10 backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-lg text-white">Create Test Project</h2>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input 
                type="text"
                placeholder="Project Name (e.g. My Shop)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              />
              <input 
                type="text"
                placeholder="Root Website URL"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              />
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-md transition-colors"
              >
                Add Project
              </button>
            </form>
          </div>

          {/* Session Controller */}
          <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4 shadow-xl shadow-black/10 backdrop-blur-md">
            <h2 className="font-semibold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Run Autonomous Session
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/75">Select Project</label>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName} ({p.websiteUrl})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/75">Target URL</label>
              <input 
                type="text" 
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/login" 
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/75">User Goal (Prompt)</label>
              <textarea 
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Try to locate and click the login button."
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-white"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/75">Persona</label>
              <select 
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
              >
                <option>Tech-Savvy User</option>
                <option>Impatient Shopper</option>
                <option>Confused Beginner</option>
              </select>
            </div>

            <div className="pt-4 border-t border-border/60 flex gap-3">
              {sessionStatus === 'running' ? (
                <button 
                  onClick={handleEndSession}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold text-sm transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" /> Stop Session
                </button>
              ) : (
                <button 
                  onClick={handleStartSession}
                  disabled={loading || !selectedProjectId}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-md font-semibold text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Start Playwright
                </button>
              )}
            </div>

            {sessionStatus === 'failed' && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to initiate session. Ensure backend is running and playwright is configured correctly.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Active MCP Monitor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md min-h-[500px] flex flex-col">
            
            {/* Monitor Header */}
            <div className="border-b border-border/60 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  Active MCP Pipeline
                </h3>
                <p className="text-xs text-foreground/50 mt-0.5">
                  {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'No active session'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex bg-background border border-border/80 p-0.5 rounded-lg text-xs font-medium">
                <button 
                  onClick={() => setActiveTab('elements')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${activeTab === 'elements' ? 'bg-indigo-600 text-white' : 'text-foreground/60 hover:text-white'}`}
                >
                  <Eye className="w-3.5 h-3.5" /> Extracted UI
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-foreground/60 hover:text-white'}`}
                >
                  <History className="w-3.5 h-3.5" /> Interactions
                </button>
                <button 
                  onClick={() => setActiveTab('screenshots')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${activeTab === 'screenshots' ? 'bg-indigo-600 text-white' : 'text-foreground/60 hover:text-white'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Screenshots
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              
              {!mcpContext ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 space-y-4">
                  <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center text-foreground/30">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Awaiting browser pipeline stream...</h4>
                    <p className="text-xs text-foreground/45 mt-1 max-w-sm">
                      Start the Playwright integration. When the page extracts DOM details, visual representations appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'elements' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      
                      {/* Page Metadata Summary */}
                      <div className="bg-background border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Current Page URL</span>
                          <p className="text-sm font-semibold text-white truncate max-w-md">{mcpContext.currentPage.url}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Current Title</span>
                          <p className="text-sm font-semibold text-white">{mcpContext.currentPage.title}</p>
                        </div>
                      </div>

                      {/* Element Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Buttons & Links */}
                        <div className="bg-background border border-border/60 rounded-xl p-4 space-y-3">
                          <h4 className="font-semibold text-sm text-white border-b border-border/40 pb-2">
                            Interactive Actions ({mcpContext.currentPage.buttons.length + mcpContext.currentPage.links.length})
                          </h4>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {mcpContext.currentPage.buttons.map((btn: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-md">
                                <span className="font-medium text-white truncate max-w-[200px]">{btn.text || '<Empty Button>'}</span>
                                <span className="bg-indigo-500/15 text-indigo-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Button</span>
                              </div>
                            ))}
                            {mcpContext.currentPage.links.map((link: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-pink-500/5 border border-pink-500/10 p-2.5 rounded-md">
                                <span className="font-medium text-white truncate max-w-[200px]">{link.text || '<Empty Link>'}</span>
                                <span className="bg-pink-500/15 text-pink-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Link</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Inputs & Fields */}
                        <div className="bg-background border border-border/60 rounded-xl p-4 space-y-3">
                          <h4 className="font-semibold text-sm text-white border-b border-border/40 pb-2">
                            Form Inputs ({mcpContext.currentPage.inputs.length})
                          </h4>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {mcpContext.currentPage.inputs.length === 0 ? (
                              <p className="text-xs text-foreground/45 py-4">No input fields found on this page.</p>
                            ) : (
                              mcpContext.currentPage.inputs.map((input: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-md">
                                  <span className="font-medium text-white truncate max-w-[200px]">{input.text || 'input-field'}</span>
                                  <span className="bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Input</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <h4 className="font-semibold text-sm text-white">Chronological Replay Log</h4>
                      <div className="border border-border/60 rounded-xl overflow-hidden bg-background divide-y divide-border/60">
                        {mcpContext.history.length === 0 ? (
                          <p className="text-xs text-foreground/45 p-6 text-center">No interactions recorded yet.</p>
                        ) : (
                          mcpContext.history.map((event: any, idx: number) => (
                            <div key={idx} className="p-4 flex items-start gap-3 hover:bg-white/[0.01]">
                              <span className="text-[10px] bg-white/5 border border-border text-foreground/75 px-2 py-1 rounded">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white capitalize">{event.type}</p>
                                <p className="text-xs text-foreground/60 mt-1">Target: <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-[10px]">{event.target}</code></p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'screenshots' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <h4 className="font-semibold text-sm text-white">Session Workflow Capture</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="border border-border/80 bg-background/50 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center text-center p-4">
                          <ImageIcon className="w-8 h-8 text-foreground/40 mb-2" />
                          <p className="text-xs text-white font-medium">Session Screen Captured</p>
                          <p className="text-[10px] text-foreground/50 mt-1">Local path stored in /storage/sessions</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

