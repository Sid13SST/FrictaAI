import React, { useState, useEffect } from 'react';
import {
  Users,
  FolderOpen,
  Plus,
  Send,
  MessageSquare,
  Clock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Share2,
  Activity,
  Layers,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  ClipboardList,
  Eye,
  Link,
  Copy,
  Info,
  Sparkles,
  TrendingUp,
  Percent,
  Shield,
  Building
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
}

interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
}

interface Project {
  id: string;
  projectName: string;
  websiteUrl: string;
}

interface WorkspaceMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface WorkspaceInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  inviter: {
    name: string | null;
    email: string;
  };
}

interface SharedInvestigation {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: {
    name: string | null;
    email: string;
  };
  workflowSession: {
    id: string;
    status: string;
    stepCount: number;
    createdAt: string;
  };
  comments: InvestigationComment[];
}

interface InvestigationComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface Annotation {
  id: string;
  targetType: string;
  targetId: string;
  title: string | null;
  content: string;
  severity: string | null;
  resolved: boolean;
  createdBy: {
    name: string | null;
    email: string;
  };
  comments: any[];
  createdAt: string;
}

interface ReviewItem {
  id: string;
  workflowSessionId: string;
  status: string;
  approvalNotes: string | null;
  assignedToId: string | null;
  workflowSession: {
    id: string;
    goal: string | null;
    persona: string | null;
    status: string;
    createdAt: string;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ActivityItem {
  id: string;
  actionType: string;
  description: string;
  createdAt: string;
  userName: string;
  metadata?: any;
}

interface WorkspaceAnalytics {
  stabilityScore: number;
  completionRate: number;
  averageFrictionScore: number;
  activeProjectsCount: number;
  totalSessionsRun: number;
  recentRegressions: Array<{
    id: string;
    metric: string;
    drift: number;
    severity: string;
    createdAt: string;
  }>;
  stabilityHistory: Array<{
    date: string;
    score: number;
  }>;
}

export const WorkspaceConsole: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Members & Invites
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('INVESTIGATOR');
  const [acceptToken, setAcceptToken] = useState<string>('');
  
  // Shared Investigations
  const [sharedInvestigations, setSharedInvestigations] = useState<SharedInvestigation[]>([]);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('');
  const [newCommentContent, setNewCommentContent] = useState<string>('');
  const [shareSessionId, setShareSessionId] = useState<string>('');
  const [shareSessionName, setShareSessionName] = useState<string>('');
  const [shareSessionDesc, setShareSessionDesc] = useState<string>('');

  // Analytics
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);

  // Tabs
  type Tab = 'reviews' | 'shared-investigations' | 'annotations' | 'activity' | 'sharing' | 'members' | 'analytics';
  const [activeTab, setActiveTab] = useState<Tab>('reviews');

  // Sub data states
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  // Presence
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);

  // Interactivity inputs
  const [newAnnotationTargetType, setNewAnnotationTargetType] = useState<string>('FINDING');
  const [newAnnotationTargetId, setNewAnnotationTargetId] = useState<string>('');
  const [newAnnotationContent, setNewAnnotationContent] = useState<string>('');
  const [newAnnotationSeverity, setNewAnnotationSeverity] = useState<string>('MEDIUM');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string>('');
  const [newAnnotationCommentContent, setNewAnnotationCommentContent] = useState<string>('');
  
  // Share link inputs
  const [shareTargetType, setShareTargetType] = useState<string>('REPLAY');
  const [shareTargetId, setShareTargetId] = useState<string>('');
  const [shareExpiry, setShareExpiry] = useState<number>(24);
  const [shareMaxUses, setShareMaxUses] = useState<number>(5);
  const [generatedLink, setGeneratedLink] = useState<string>('');

  // Org branding states
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState<string>('');

  // Loading/Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const baseApiUrl = 'http://127.0.0.1:3001/api';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchWorkspaceDetails(selectedWorkspaceId);
      const closeSSE = setupWorkspaceSSE(selectedWorkspaceId);
      return () => {
        closeSSE();
      };
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedWorkspaceId && activeTab === 'analytics') {
      fetchAnalytics(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${baseApiUrl}/organizations`);
      if (!res.ok) throw new Error('Failed to load organizations');
      const data = await res.json();
      
      setOrganizations(data.organizations || []);
      setWorkspaces(data.workspaces || []);
      
      if (data.workspaces && data.workspaces.length > 0) {
        setSelectedWorkspaceId(data.workspaces[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching workspace data');
      setLoading(false);
    }
  };

  const fetchWorkspaceDetails = async (workspaceId: string) => {
    try {
      const [projRes, memberRes, actRes, inviteRes, sharedRes] = await Promise.all([
        fetch(`${baseApiUrl}/workspace/projects?workspaceId=${workspaceId}`),
        fetch(`${baseApiUrl}/workspace/members?workspaceId=${workspaceId}`),
        fetch(`${baseApiUrl}/workspace/activity?workspaceId=${workspaceId}`),
        fetch(`${baseApiUrl}/workspace/invites?workspaceId=${workspaceId}`),
        fetch(`${baseApiUrl}/workspace/investigations?workspaceId=${workspaceId}`)
      ]);

      const projData = await projRes.json();
      const memberData = await memberRes.json();
      const actData = await actRes.json();
      const inviteData = await inviteRes.json();
      const sharedData = await sharedRes.json();

      setProjects(projData.projects || []);
      setMembers(memberData.members || []);
      setActivities(actData.feed || []);
      setInvites(inviteData.invites || []);
      setSharedInvestigations(sharedData.investigations || []);

      if (sharedData.investigations && sharedData.investigations.length > 0) {
        setSelectedInvestigationId(sharedData.investigations[0].id);
      } else {
        setSelectedInvestigationId('');
      }

      if (projData.projects && projData.projects.length > 0) {
        setSelectedProjectId(projData.projects[0].id);
      } else {
        setSelectedProjectId('');
        setReviews([]);
        setAnnotations([]);
      }
      
      sendPresenceHeartbeat(workspaceId);
    } catch (err: any) {
      console.error('Failed to load workspace parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const [revRes, annRes] = await Promise.all([
        fetch(`${baseApiUrl}/workspace/reviews?projectId=${projectId}`),
        fetch(`${baseApiUrl}/workspace/annotations?projectId=${projectId}`)
      ]);

      const revData = await revRes.json();
      const annData = await annRes.json();

      setReviews(revData.queue || []);
      setAnnotations(annData.annotations || []);
      
      if (revData.queue && revData.queue.length > 0) {
        setShareTargetId(revData.queue[0].workflowSessionId);
        setNewAnnotationTargetId(revData.queue[0].workflowSessionId);
        setShareSessionId(revData.queue[0].workflowSessionId);
      }
    } catch (err) {
      console.error('Failed to load project parameters:', err);
    }
  };

  const fetchAnalytics = async (workspaceId: string) => {
    try {
      const res = await fetch(`${baseApiUrl}/workspace/analytics?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch workspace analytics:', err);
    }
  };

  const setupWorkspaceSSE = (workspaceId: string) => {
    const sseUrl = `${baseApiUrl}/stream/${workspaceId}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('presence.sync', (e: any) => {
      const payload = JSON.parse(e.data);
      setPresenceUsers(payload.users || []);
    });

    eventSource.addEventListener('annotation.created', () => {
      if (selectedProjectId) fetchProjectDetails(selectedProjectId);
    });

    eventSource.addEventListener('annotation.resolved', () => {
      if (selectedProjectId) fetchProjectDetails(selectedProjectId);
    });

    eventSource.addEventListener('comment.created', () => {
      if (selectedProjectId) fetchProjectDetails(selectedProjectId);
    });

    eventSource.addEventListener('review.updated', () => {
      if (selectedProjectId) fetchProjectDetails(selectedProjectId);
    });

    eventSource.addEventListener('workspace.members.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.projects.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.investigations.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.comments.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    return () => {
      eventSource.close();
    };
  };

  const sendPresenceHeartbeat = async (workspaceId: string, screen = 'console') => {
    try {
      await fetch(`${baseApiUrl}/workspace/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          activeScreen: `${screen}:${workspaceId}`
        })
      });
    } catch (err) {
      console.warn('Presence heartbeat failure', err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const res = await fetch(`${baseApiUrl}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create organization');
      }

      setNewOrgName('');
      alert('Organization and main workspace created successfully!');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    if (!currentWorkspace) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentWorkspace.organizationId,
          name: newWorkspaceName,
          description: newWorkspaceDesc
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create workspace');
      }

      const data = await res.json();
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      alert('Workspace created successfully!');
      setSelectedWorkspaceId(data.workspace.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to send invite');
      }

      setInviteEmail('');
      alert('Workspace invitation sent successfully!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptToken.trim()) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/invites/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: acceptToken })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to accept invitation');
      }

      setAcceptToken('');
      alert('Successfully joined workspace!');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleShareInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareSessionId || !shareSessionName.trim()) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/investigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          workflowSessionId: shareSessionId,
          name: shareSessionName,
          description: shareSessionDesc
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to share investigation');
      }

      setShareSessionName('');
      setShareSessionDesc('');
      alert('Investigation shared with the workspace team!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !selectedInvestigationId) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/investigations/${selectedInvestigationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newCommentContent })
      });

      if (!res.ok) throw new Error('Failed to post comment');
      setNewCommentContent('');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotationContent || !newAnnotationTargetId) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          targetType: newAnnotationTargetType,
          targetId: newAnnotationTargetId,
          content: newAnnotationContent,
          severity: newAnnotationSeverity
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to submit annotation');
      }

      setNewAnnotationContent('');
      if (selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveAnnotation = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${baseApiUrl}/workspace/annotations/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !currentStatus })
      });
      if (!res.ok) throw new Error('Resolution update failed');
      if (selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAnnotationComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotationCommentContent || !selectedAnnotationId) return;

    try {
      const res = await fetch(`${baseApiUrl}/workspace/annotations/${selectedAnnotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newAnnotationCommentContent })
      });

      if (!res.ok) throw new Error('Failed to submit comment');
      setNewAnnotationCommentContent('');
      if (selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewAction = async (sessionId: string, actionStatus: string) => {
    const notes = prompt('Enter review summary notes (optional):');
    try {
      const res = await fetch(`${baseApiUrl}/workspace/reviews/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowSessionId: sessionId,
          status: actionStatus,
          notes: notes || undefined
        })
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Review update failed');
      }
      if (selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignReview = async (sessionId: string, memberId: string) => {
    try {
      const res = await fetch(`${baseApiUrl}/workspace/reviews/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowSessionId: sessionId,
          assignedToId: memberId || null
        })
      });
      if (!res.ok) throw new Error('Assignment failed');
      if (selectedProjectId) {
        fetchProjectDetails(selectedProjectId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTargetId) return;

    try {
      const res = await fetch(`${baseApiUrl}/sharing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          targetType: shareTargetType,
          targetId: shareTargetId,
          expiresInHours: Number(shareExpiry),
          maxUses: Number(shareMaxUses)
        })
      });

      if (!res.ok) throw new Error('Failed to create shared link');
      const data = await res.json();
      setGeneratedLink(`${window.location.origin}/share/validate/${data.link.token}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied link to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09090b] text-zinc-500 font-mono text-xs">
        <Clock className="w-4 h-4 animate-spin mr-2 text-[#5ed29c]" />
        LOADING ENTERPRISE COMMAND WORKSPACE...
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans p-6">
      
      {/* ── Header Command Bar ─────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222226] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5ed29c] animate-pulse"></span>
            <h1 className="text-sm font-black font-mono text-white uppercase tracking-widest">
              COLLABORATIVE WORKSPACE COMMAND CONSOLE
            </h1>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 uppercase">
            Governed intelligence Command Center • {activeWorkspace?.name || 'Standalone Mode'}
          </p>
        </div>

        {/* Workspace Switcher & Branding Details */}
        <div className="flex items-center gap-3">
          {presenceUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 bg-[#121214] border border-[#222226] px-2.5 py-1 rounded-full text-[9px] font-mono font-bold text-zinc-400">
              <span className="mr-2 text-zinc-600 uppercase font-black tracking-wider">Active Presence:</span>
              {presenceUsers.map((user, idx) => (
                <div
                  key={idx}
                  title={`${user.name} viewing ${user.activeScreen}`}
                  className="w-5 h-5 rounded-full bg-[#1c1c20] border border-[#222226] flex items-center justify-center font-bold text-[#5ed29c] text-[9px] relative group"
                >
                  {user.name.substring(0, 2).toUpperCase()}
                  <span className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black border border-[#333] text-[9px] px-2 py-0.5 rounded text-white hidden group-hover:block whitespace-nowrap z-50">
                    {user.name} ({user.activeScreen})
                  </span>
                </div>
              ))}
            </div>
          )}

          {workspaces.length > 0 && (
            <div className="flex items-center gap-2 bg-[#121214] border border-[#222226] px-3 py-1.5 rounded-xl">
              <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="bg-transparent border-none text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#121214] text-white">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black font-mono text-red-400 uppercase">Operational Error</h4>
            <p className="text-xs text-zinc-400 mt-1 font-sans">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ── Left Rail Navigation ────────────────────────────────────────── */}
        <aside className="lg:col-span-1 flex flex-col gap-2">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-black px-3.5 mb-1 block">
            Workspace Hub
          </span>
          {[
            { key: 'reviews', label: 'Review Pipelines', icon: ClipboardList },
            { key: 'shared-investigations', label: 'Shared Investigations', icon: Sparkles },
            { key: 'analytics', label: 'Organization Analytics', icon: TrendingUp },
            { key: 'annotations', label: 'Evidence Annotations', icon: MessageSquare },
            { key: 'activity', label: 'Workspace Audit Logs', icon: Activity },
            { key: 'sharing', label: 'Controlled Link Sharing', icon: Share2 },
            { key: 'members', label: 'Governance Members', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as Tab);
                  if (selectedWorkspaceId) {
                    sendPresenceHeartbeat(selectedWorkspaceId, tab.key);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-mono font-bold border text-left transition-all ${
                  isActive
                    ? 'bg-[#5ed29c]/10 text-white border-[#5ed29c]/20'
                    : 'border-transparent text-zinc-400 hover:bg-[#121214] hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5ed29c]' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}

          {/* Org & Workspace Creators */}
          <div className="bg-[#121214]/50 border border-[#222226]/50 rounded-xl p-4 mt-6">
            <h4 className="text-[10px] font-black font-mono text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building className="w-3 h-3 text-[#5ed29c]" /> Organization Settings
            </h4>
            
            <form onSubmit={handleCreateOrg} className="flex flex-col gap-2 mb-4 border-b border-[#222226] pb-4">
              <span className="text-[9px] font-mono text-zinc-500 uppercase">Create Organization</span>
              <input
                type="text"
                placeholder="New Org Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono text-white px-2 py-1.5 rounded-lg focus:outline-none"
              />
              <button
                type="submit"
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[9px] font-black uppercase py-1.5 rounded-lg border border-[#333]"
              >
                Create Org
              </button>
            </form>

            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-zinc-500 uppercase">Create Workspace</span>
              <input
                type="text"
                placeholder="Workspace Name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono text-white px-2 py-1.5 rounded-lg focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono text-white px-2 py-1.5 rounded-lg focus:outline-none"
              />
              <button
                type="submit"
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[9px] font-black uppercase py-1.5 rounded-lg border border-[#333]"
              >
                Create Workspace
              </button>
            </form>
          </div>

          <div className="bg-[#121214]/50 border border-[#222226]/50 rounded-xl p-4 mt-4">
            <h4 className="text-[10px] font-black font-mono text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3 text-[#5ed29c]" /> Active Scoped Project
            </h4>
            {projects.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono font-bold text-white px-2 py-1.5 rounded-lg focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mt-1">
                  Scope ID: {selectedProjectId.substring(0, 8)}...
                </span>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-zinc-600 italic">No projects scoped to workspace.</p>
            )}
          </div>
        </aside>

        {/* ── Main Workspace Canvas ───────────────────────────────────────── */}
        <main className="lg:col-span-3 min-w-0">
          
          {/* TAB 1: REVIEW PIPELINES */}
          {activeTab === 'reviews' && (
            <div className="flex flex-col gap-6">
              <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#5ed29c]" /> Investigation Review Queue
                </h3>
                <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                  Verify and approve agent runs before committing findings to historical intelligence indexes
                </p>

                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic border border-dashed border-[#222226] rounded-xl">
                    Review queue is empty. Trigger runs in standalone mode or projects.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reviews.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#18181b] border border-[#2d2d30] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${
                              item.status === 'APPROVED' ? 'bg-[#5ed29c]/10 text-[#5ed29c] border border-[#5ed29c]/20' :
                              item.status === 'RESOLVED' ? 'bg-blue-950/20 text-blue-400 border border-blue-500/20' :
                              item.status === 'REJECTED' ? 'bg-red-950/20 text-red-400 border border-red-500/20' :
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              Session ID: {item.workflowSessionId.substring(0, 8)}...
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white font-mono mb-1">
                            {item.workflowSession.goal || 'General Usability Audit'}
                          </h4>
                          {item.approvalNotes && (
                            <p className="text-[11px] text-zinc-400 font-mono bg-[#121214] px-2.5 py-1.5 rounded-lg border border-[#222226] mt-2">
                              Notes: {item.approvalNotes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                            <select
                              value={item.assignedToId || ''}
                              onChange={(e) => handleAssignReview(item.workflowSessionId, e.target.value)}
                              className="bg-[#121214] border border-[#222226] text-xs font-mono font-bold text-white px-2 py-1 rounded-lg focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.user.id} value={m.user.id}>
                                  {m.user.name || m.user.email}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => handleReviewAction(item.workflowSessionId, 'APPROVED')}
                            className="bg-[#5ed29c]/10 hover:bg-[#5ed29c]/20 border border-[#5ed29c]/20 text-[#5ed29c] text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewAction(item.workflowSessionId, 'REJECTED')}
                            className="bg-red-950/20 hover:bg-red-950/35 border border-red-500/20 text-red-400 text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReviewAction(item.workflowSessionId, 'RESOLVED')}
                            className="bg-blue-950/20 hover:bg-blue-950/35 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase transition-all"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SHARED INVESTIGATIONS */}
          {activeTab === 'shared-investigations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Share list */}
              <div className="lg:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5ed29c]" /> Shared Team Investigations
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">
                      Shared agent workflow reviews under team-wide discussion
                    </p>
                  </div>
                </div>

                {sharedInvestigations.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic border border-dashed border-[#222226] rounded-xl">
                    No investigations shared with this workspace yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sharedInvestigations.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedInvestigationId(item.id)}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedInvestigationId === item.id
                            ? 'bg-[#18181b] border-[#5ed29c]/40 shadow-lg shadow-[#5ed29c]/5'
                            : 'bg-[#18181b]/60 border-[#2d2d30] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-white font-mono">{item.name}</h4>
                          <span className="text-[8px] font-mono text-[#5ed29c] bg-[#5ed29c]/5 px-2 py-0.5 rounded border border-[#5ed29c]/10">
                            SESSION {item.workflowSession.id.substring(0, 8)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-zinc-400 font-mono mb-3">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t border-[#222226]/50 pt-2.5">
                          <span>Owner: {item.createdBy.name || item.createdBy.email}</span>
                          <span>{item.comments.length} Comments • {item.workflowSession.stepCount} Steps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Details & Comments */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Share input */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-3">
                    Share a Run Session
                  </h4>
                  <form onSubmit={handleShareInvestigation} className="flex flex-col gap-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Session Reference</label>
                      <select
                        value={shareSessionId}
                        onChange={(e) => setShareSessionId(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="">Choose session...</option>
                        {reviews.map((r) => (
                          <option key={r.workflowSessionId} value={r.workflowSessionId}>
                            {r.workflowSession.goal || 'General Run'} ({r.workflowSessionId.substring(0, 8)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="Investigation Name"
                        value={shareSessionName}
                        onChange={(e) => setShareSessionName(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Review Context</label>
                      <textarea
                        rows={2}
                        placeholder="Instructions for reviews..."
                        value={shareSessionDesc}
                        onChange={(e) => setShareSessionDesc(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!shareSessionId || !shareSessionName}
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      Share with Workspace
                    </button>
                  </form>
                </div>

                {/* Threaded comments */}
                {selectedInvestigationId && (() => {
                  const activeInv = sharedInvestigations.find(s => s.id === selectedInvestigationId);
                  if (!activeInv) return null;
                  return (
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col min-h-[300px]">
                      <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-2">
                        Collaborative Notes
                      </h4>
                      <div className="flex-1 overflow-y-auto max-h-60 mb-4 flex flex-col gap-2.5 border-b border-[#222226] pb-3 pr-1">
                        {activeInv.comments.length === 0 ? (
                          <div className="text-center py-8 text-zinc-600 font-mono text-[10px] italic">
                            No team notes. Share comments below.
                          </div>
                        ) : (
                          activeInv.comments.map((c) => (
                            <div key={c.id} className="bg-[#18181b] border border-[#2d2d30] p-2.5 rounded-lg">
                              <div className="flex justify-between items-center mb-1 text-[8.5px] font-mono font-bold text-zinc-500">
                                <span>{c.user.name || c.user.email}</span>
                                <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-[11px] text-zinc-300 font-mono">{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handlePostComment} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Comment context..."
                          value={newCommentContent}
                          onChange={(e) => setNewCommentContent(e.target.value)}
                          className="flex-1 bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: ORGANIZATION ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {analytics ? (
                <>
                  {/* Gauge Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gauge 1: Stability Index */}
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-3 right-3 text-zinc-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      <h4 className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest mb-4">
                        Workspace Stability Index
                      </h4>
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#1c1c1f" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#5ed29c"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * analytics.stabilityScore) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-white font-mono">{analytics.stabilityScore}%</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase">Stable</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono mt-4">
                        Weighted health score across all workspace runs.
                      </p>
                    </div>

                    {/* Gauge 2: Completion Rate */}
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-3 right-3 text-zinc-600">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <h4 className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest mb-4">
                        Aggregate Completion Rate
                      </h4>
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#1c1c1f" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#60a5fa"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * analytics.completionRate) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-white font-mono">{analytics.completionRate}%</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase">Success</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono mt-4">
                        Percentage of simulated sessions completing their targets.
                      </p>
                    </div>

                    {/* Gauge 3: Friction Load */}
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-3 right-3 text-zinc-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h4 className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest mb-4">
                        Average Friction Load
                      </h4>
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#1c1c1f" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#f87171"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * analytics.averageFrictionScore) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-white font-mono">{analytics.averageFrictionScore}%</span>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase">Friction</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono mt-4">
                        Aggregated cognitive & hesitation loads detected.
                      </p>
                    </div>
                  </div>

                  {/* SVG Longitudinal Trend Graph */}
                  <div className="bg-[#121214] border border-[#222226] rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#5ed29c]/25 to-transparent"></div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-xs font-black font-mono uppercase tracking-widest text-white flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[#5ed29c] animate-pulse" /> Longitudinal Stability Drift Timeline
                        </h3>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
                          Continuous verification of UX performance and regressions over time
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/15 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        Live Diagnostics
                      </span>
                    </div>

                    <div className="w-full h-56 bg-[#161619]/40 border border-[#222226] rounded-xl p-4 flex flex-col justify-between">
                      {analytics.stabilityHistory && analytics.stabilityHistory.length > 0 ? (
                        (() => {
                          const chartWidth = 530;
                          const chartHeight = 150;
                          const startX = 45;
                          const startY = 15;

                          const pts = analytics.stabilityHistory.map((h, index) => {
                            const x = startX + (index / Math.max(1, analytics.stabilityHistory.length - 1)) * chartWidth;
                            const y = startY + (1 - h.score / 100) * chartHeight;
                            return { x, y, score: h.score, date: h.date };
                          });

                          const getBezierPath = (points: typeof pts) => {
                            if (points.length === 0) return '';
                            if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                            let d = `M ${points[0].x} ${points[0].y}`;
                            for (let i = 0; i < points.length - 1; i++) {
                              const curr = points[i];
                              const next = points[i + 1];
                              const cpX1 = curr.x + (next.x - curr.x) / 3;
                              const cpY1 = curr.y;
                              const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
                              const cpY2 = next.y;
                              d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
                            }
                            return d;
                          };

                          const lineD = getBezierPath(pts);
                          const areaD = pts.length > 0
                            ? `${lineD} L ${pts[pts.length - 1].x} ${startY + chartHeight} L ${pts[0].x} ${startY + chartHeight} Z`
                            : '';

                          return (
                            <div className="relative w-full h-full flex flex-col justify-between">
                              <svg className="w-full h-full" viewBox="0 0 600 185">
                                <defs>
                                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#5ed29c" stopOpacity="0.0" />
                                  </linearGradient>
                                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                  </filter>
                                </defs>

                                {/* Y-Axis Grid Lines & Labels */}
                                {[100, 75, 50, 25, 0].map((val, idx) => {
                                  const y = startY + (1 - val / 100) * chartHeight;
                                  return (
                                    <g key={idx}>
                                      <text
                                        x={startX - 10}
                                        y={y + 3}
                                        fill="#71717a"
                                        fontSize="9"
                                        fontFamily="monospace"
                                        textAnchor="end"
                                      >
                                        {val}%
                                      </text>
                                      <line
                                        x1={startX}
                                        y1={y}
                                        x2={startX + chartWidth}
                                        y2={y}
                                        stroke="#1f1f23"
                                        strokeWidth="1"
                                        strokeDasharray={val === 0 ? 'none' : '4,4'}
                                      />
                                    </g>
                                  );
                                })}

                                {/* Vertical Axis Dividers */}
                                {pts.map((p, idx) => (
                                  <line
                                    key={idx}
                                    x1={p.x}
                                    y1={startY}
                                    x2={p.x}
                                    y2={startY + chartHeight}
                                    stroke="#18181b"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                ))}

                                {/* Filled Gradient Area */}
                                {areaD && (
                                  <path d={areaD} fill="url(#chartGradient)" />
                                )}

                                {/* Smooth Bezier Line */}
                                {lineD && (
                                  <path
                                    d={lineD}
                                    fill="none"
                                    stroke="#5ed29c"
                                    strokeWidth="2.5"
                                    filter="url(#glow)"
                                    strokeLinecap="round"
                                  />
                                )}

                                {/* Diagnostic Data Points with Custom Floating Tooltip Badges */}
                                {pts.map((p, idx) => (
                                  <g key={idx} className="group cursor-pointer">
                                    {/* Outer glowing ring */}
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r="6"
                                      fill="rgba(94, 210, 156, 0.15)"
                                      stroke="#5ed29c"
                                      strokeWidth="1"
                                    />
                                    {/* Inner solid dot */}
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r="3"
                                      fill="#5ed29c"
                                    />

                                    {/* Floating Score Badge above the node */}
                                    <g className="opacity-80 group-hover:opacity-100 transition-opacity">
                                      <rect
                                        x={p.x - 18}
                                        y={p.y - 28}
                                        width="36"
                                        height="16"
                                        rx="4"
                                        fill="#09090b"
                                        stroke="#5ed29c"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={p.x}
                                        y={p.y - 17}
                                        fill="#fff"
                                        fontSize="8"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                        textAnchor="middle"
                                      >
                                        {p.score}%
                                      </text>
                                    </g>
                                  </g>
                                ))}
                              </svg>
                              <div className="flex justify-between mt-2 text-[9px] font-mono text-zinc-500 uppercase px-1">
                                <span>{analytics.stabilityHistory[0]?.date || 'Start'}</span>
                                <span className="text-zinc-600 tracking-wider">LONGITUDINAL INTEGRITY INDEX</span>
                                <span>{analytics.stabilityHistory[analytics.stabilityHistory.length - 1]?.date || 'End'}</span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center text-zinc-600 font-mono text-xs italic py-12">
                          Insufficient historical runs to compute drift chart.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Regression Alerts Table */}
                  <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-3">
                      Active Workspace Drift & Regression Alerts
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#222226] text-left text-zinc-500 text-[10px] uppercase font-black">
                            <th className="py-2.5 pr-4">Metric</th>
                            <th className="py-2.5 px-4">Severity</th>
                            <th className="py-2.5 px-4">Drift Ratio</th>
                            <th className="py-2.5 pl-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222226]/50">
                          {analytics.recentRegressions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-zinc-600 italic">
                                Zero workspace regressions registered in active timeline.
                              </td>
                            </tr>
                          ) : (
                            analytics.recentRegressions.map((reg) => (
                              <tr key={reg.id} className="hover:bg-[#18181b]/30">
                                <td className="py-3 pr-4 text-white font-bold">{reg.metric}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                    reg.severity === 'CRITICAL' ? 'bg-red-950/20 text-red-400 border border-red-500/20' :
                                    reg.severity === 'HIGH' ? 'bg-amber-950/20 text-amber-400 border border-amber-500/20' :
                                    'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    {reg.severity}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-red-400 font-bold">+{reg.drift}% Drift</td>
                                <td className="py-3 pl-4 text-zinc-500">
                                  {new Date(reg.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-zinc-500 font-mono text-xs italic">
                  Compiling workspace statistics...
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVIDENCE ANNOTATIONS */}
          {activeTab === 'annotations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#121214] border border-[#222226] rounded-xl p-5">
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#5ed29c]" /> Active Project Annotations
                </h3>
                <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                  Contextual annotations dropped by team members on finding cards or timelines
                </p>

                {annotations.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic border border-dashed border-[#222226] rounded-xl">
                    No annotations created. Click finding items or add manual inputs.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {annotations.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedAnnotationId(item.id)}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedAnnotationId === item.id
                            ? 'bg-[#18181b] border-[#5ed29c]/40 shadow-lg shadow-[#5ed29c]/5'
                            : 'bg-[#18181b]/60 border-[#2d2d30] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono font-black bg-[#1c1c1f] text-zinc-400 px-2 py-0.5 rounded border border-[#2d2d30] uppercase">
                              {item.targetType}
                            </span>
                            {item.severity && (
                              <span className="text-[8.5px] font-mono text-red-400 bg-red-950/10 border border-red-500/10 px-1.5 py-0.5 rounded font-black">
                                {item.severity}
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-zinc-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-white font-mono mb-2">{item.content}</p>
                        
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                          <span>By: {item.createdBy?.name || item.createdBy?.email}</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-[#5ed29c]" /> {item.comments.length} Comments
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#222226] justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAnnotation(item.id, item.resolved);
                            }}
                            className={`flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-1 rounded ${
                              item.resolved
                                  ? 'bg-[#5ed29c]/10 text-[#5ed29c] border border-[#5ed29c]/20'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                            }`}
                          >
                            {item.resolved ? 'RESOLVED' : 'MARK RESOLVED'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Threaded Discussion Rail */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4">
                    New Annotation
                  </h4>
                  <form onSubmit={handleAddAnnotation} className="flex flex-col gap-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Target Type</label>
                      <select
                        value={newAnnotationTargetType}
                        onChange={(e) => setNewAnnotationTargetType(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="FINDING">UX Finding</option>
                        <option value="SCREENSHOT">Screenshot</option>
                        <option value="TIMELINE_EVENT">Replay Timeline</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Target ID / Reference</label>
                      <input
                        type="text"
                        placeholder="Paste session or finding UUID"
                        value={newAnnotationTargetId}
                        onChange={(e) => setNewAnnotationTargetId(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Severity</label>
                      <select
                        value={newAnnotationSeverity}
                        onChange={(e) => setNewAnnotationSeverity(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="LOW">Low Friction</option>
                        <option value="MEDIUM">Medium Friction</option>
                        <option value="HIGH">High Friction</option>
                        <option value="CRITICAL">Critical Defect</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Observation Context</label>
                      <textarea
                        rows={3}
                        placeholder="What usability issues occurred?"
                        value={newAnnotationContent}
                        onChange={(e) => setNewAnnotationContent(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all"
                    >
                      Publish Annotation
                    </button>
                  </form>
                </div>

                {selectedAnnotationId && (() => {
                  const activeAnn = annotations.find((a) => a.id === selectedAnnotationId);
                  if (!activeAnn) return null;
                  return (
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 flex-1 flex flex-col min-h-[300px]">
                      <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-2">
                        Threaded Discussion
                      </h4>
                      <p className="text-[9px] font-mono text-zinc-500 uppercase mb-3">Annotation Thread #{activeAnn.id.substring(0, 8)}</p>

                      <div className="flex-1 overflow-y-auto max-h-64 mb-4 pr-1 flex flex-col gap-2.5 border-b border-[#222226] pb-3">
                        {activeAnn.comments.length === 0 ? (
                          <div className="text-center py-8 text-zinc-600 font-mono text-[10px] italic">
                            No discussion yet. Start the thread below.
                          </div>
                        ) : (
                          activeAnn.comments.map((c) => (
                            <div key={c.id} className="bg-[#18181b] border border-[#2d2d30] p-2.5 rounded-lg">
                              <div className="flex justify-between items-center mb-1 text-[8.5px] font-mono font-bold text-zinc-500">
                                <span>{c.createdBy?.name || c.createdBy?.email}</span>
                                <span>{new Date(c.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[11px] text-zinc-300 font-mono">{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleAddAnnotationComment} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type message..."
                          value={newAnnotationCommentContent}
                          onChange={(e) => setNewAnnotationCommentContent(e.target.value)}
                          className="flex-1 bg-[#1c1c1f] border border-[#2d2d30] text-xs font-mono text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 5: WORKSPACE AUDIT LOGS */}
          {activeTab === 'activity' && (
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
              <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5ed29c]" /> Workspace Activity & Audit Trail
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                Chronological ledger of intelligence runs, approvals, permissions, and exports
              </p>

              {activities.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-mono text-[11px] italic border border-dashed border-[#222226] rounded-xl">
                  Audit trail is empty.
                </div>
              ) : (
                <div className="flex flex-col border border-[#222226] rounded-xl overflow-hidden divide-y divide-[#222226]">
                  {activities.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#18181b]/55 p-3.5 font-mono text-xs flex items-start justify-between gap-4 hover:bg-[#18181b]"
                    >
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-zinc-300 font-bold mb-0.5">{item.description}</p>
                          <div className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase font-black">
                            <span className="text-[#5ed29c] bg-[#5ed29c]/5 border border-[#5ed29c]/10 px-1 rounded">
                              {item.actionType}
                            </span>
                            <span>Operator: {item.userName}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-500 shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONTROLLED SHARING */}
          {activeTab === 'sharing' && (
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
              <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#5ed29c]" /> Access-Controlled Link Sharing
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                Generate secure sharing URLs for external stakeholders with automatic time-based or usage-limit expiration
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <form onSubmit={handleGenerateLink} className="flex flex-col gap-4 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Target Type</label>
                      <select
                        value={shareTargetType}
                        onChange={(e) => setShareTargetType(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="REPLAY">Session Visual Replay</option>
                        <option value="REPORT">Executive UX Report</option>
                        <option value="SUMMARY">Executive Summary Summary</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Target ID</label>
                      <input
                        type="text"
                        placeholder="Session ID or Report ID"
                        value={shareTargetId}
                        onChange={(e) => setShareTargetId(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Expiry (Hours)</label>
                        <select
                          value={shareExpiry}
                          onChange={(e) => setShareExpiry(Number(e.target.value))}
                          className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                        >
                          <option value="1">1 Hour</option>
                          <option value="2">2 Hours</option>
                          <option value="12">12 Hours</option>
                          <option value="24">24 Hours</option>
                          <option value="168">7 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Max Uses</label>
                        <input
                          type="number"
                          min={1}
                          value={shareMaxUses}
                          onChange={(e) => setShareMaxUses(Number(e.target.value))}
                          className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all"
                    >
                      Generate Secured Link
                    </button>
                  </form>
                </div>

                <div className="flex flex-col justify-center items-center bg-[#18181b]/50 border border-[#2d2d30]/50 rounded-xl p-6 text-center">
                  <Link className="w-10 h-10 text-zinc-500 mb-3" />
                  {generatedLink ? (
                    <div className="w-full">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase mb-2">Share Link Token Active</p>
                      <div className="bg-[#121214] border border-[#222226] p-3 rounded-lg flex items-center justify-between gap-3 text-left mb-3">
                        <span className="font-mono text-xs text-white truncate flex-1 pr-2 select-all">
                          {generatedLink}
                        </span>
                        <button
                          onClick={() => copyToClipboard(generatedLink)}
                          className="text-[#5ed29c] hover:bg-[#5ed29c]/5 p-1.5 rounded border border-[#5ed29c]/10 transition-all shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[9.5px] font-mono text-zinc-500 uppercase">
                        Token will auto-expire in {shareExpiry} hours or after {shareMaxUses} clicks.
                      </p>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-zinc-500 italic max-w-xs">
                      Enter target reference details on the left and click generate to publish an access link.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GOVERNANCE MEMBERS */}
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Member List */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#5ed29c]" /> Workspace Role Directory
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                    Workspace members and RBAC authority levels
                  </p>

                  <div className="flex flex-col border border-[#222226] rounded-xl overflow-hidden divide-y divide-[#222226]">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="bg-[#18181b]/55 p-4 flex items-center justify-between gap-4 font-mono text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-[#222226] flex items-center justify-center font-bold text-white text-xs">
                            {m.user.name ? m.user.name.substring(0, 2).toUpperCase() : m.user.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-xs">{m.user.name || 'Invited User'}</h4>
                            <span className="text-[10px] text-zinc-500">{m.user.email}</span>
                          </div>
                        </div>

                        <span className="bg-[#5ed29c]/5 border border-[#5ed29c]/15 text-[#5ed29c] font-black text-[9px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invites */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#5ed29c]" /> Pending Workspace Invitations
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                    Outstanding team invitations awaiting acceptance
                  </p>

                  {invites.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 font-mono text-[10px] italic">
                      No pending workspace invitations.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {invites.map((invite) => (
                        <div key={invite.id} className="bg-[#18181b] border border-[#2d2d30] p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-white font-bold">{invite.email}</span>
                            <div className="text-[9px] text-zinc-500 uppercase mt-0.5">
                              Role: {invite.role} • Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="text-[#5ed29c] font-black text-[9px] bg-[#5ed29c]/5 border border-[#5ed29c]/15 px-2 py-0.5 rounded">
                            PENDING
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Invite Form */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4">
                    Invite Governance Member
                  </h4>
                  <form onSubmit={handleInvite} className="flex flex-col gap-3.5 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">User Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. member@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Workspace Authority Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="UX_LEAD">UX Lead (Governance/Approvals)</option>
                        <option value="INVESTIGATOR">Investigator (Runs/Annotations)</option>
                        <option value="REVIEWER">Reviewer (Annotations/Verification)</option>
                        <option value="VIEWER">Viewer (Read-Only)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all"
                    >
                      Send Workspace Invitation
                    </button>
                  </form>
                </div>

                {/* Accept Invite */}
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-3">
                    Redeem Invitation Token
                  </h4>
                  <form onSubmit={handleAcceptInvite} className="flex flex-col gap-3 font-mono text-xs">
                    <input
                      type="text"
                      placeholder="Enter invite token code"
                      value={acceptToken}
                      onChange={(e) => setAcceptToken(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all"
                    >
                      Join Workspace
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};
