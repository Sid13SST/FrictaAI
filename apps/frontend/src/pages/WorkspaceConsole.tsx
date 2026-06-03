import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../lib/api';
const baseApiUrl = API_BASE.replace('/api', '');
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
  Building,
  Lock,
  Unlock,
  Trash2,
  Settings,
  Key,
  Check,
  FileText,
  Layout,
  Download,
  Mail
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

interface RBACRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{
    id: string;
    domain: string;
    action: string;
    isAllowed: boolean;
  }>;
}

interface WorkspacePolicy {
  key: string;
  value: string;
}

interface SecurityLogEvent {
  id: string;
  eventType: string;
  severity: string;
  description: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  } | null;
}

interface ReplayAccessScope {
  id: string;
  workflowSessionId: string;
  scopeType: string;
  allowedRoles: string[];
}

interface SharedAccessGrant {
  id: string;
  resourceType: string;
  resourceId: string;
  granteeEmail: string | null;
  expiresAt: string | null;
  createdAt: string;
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

  // RBAC & Governance States
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [customRoleName, setCustomRoleName] = useState<string>('');
  const [customRoleDesc, setCustomRoleDesc] = useState<string>('');
  
  const [policies, setPolicies] = useState<WorkspacePolicy[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogEvent[]>([]);
  const [replayScopes, setReplayScopes] = useState<ReplayAccessScope[]>([]);
  const [sharedGrants, setSharedGrants] = useState<SharedAccessGrant[]>([]);
  
  // Active selected shared investigation access rules
  const [investigationAccesses, setInvestigationAccesses] = useState<any[]>([]);
  const [newAccessAccessorType, setNewAccessAccessorType] = useState<string>('ROLE');
  const [newAccessAccessorId, setNewAccessAccessorId] = useState<string>('ANALYST');
  const [newAccessCanRead, setNewAccessCanRead] = useState<boolean>(true);
  const [newAccessCanWrite, setNewAccessCanWrite] = useState<boolean>(false);

  // Analytics
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);

  // Enterprise Reporting States
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [exports, setExports] = useState<any[]>([]);
  const [shareTokens, setShareTokens] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [evidenceLinks, setEvidenceLinks] = useState<any[]>([]);
  const [digests, setDigests] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('RISK_REPORT');
  
  const [newShareExpiresHours, setNewShareExpiresHours] = useState<number>(24);
  const [newShareMaxUses, setNewShareMaxUses] = useState<number>(10);
  const [newShareEmail, setNewShareEmail] = useState<string>('');
  const [newDistributionChannel, setNewDistributionChannel] = useState<string>('EMAIL');
  const [newDistributionRecipient, setNewDistributionRecipient] = useState<string>('stakeholder@fricta.ai');
  const [newDigestTitle, setNewDigestTitle] = useState<string>('Weekly Performance Overview');
  const [newDigestPeriod, setNewDigestPeriod] = useState<string>('WEEKLY');

  const [deckData, setDeckData] = useState<any | null>(null);
  const [pdfLayout, setPdfLayout] = useState<any | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [reportBuilding, setReportBuilding] = useState<boolean>(false);
  const [reportExporting, setReportExporting] = useState<boolean>(false);

  // Security Core states
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [complianceReport, setComplianceReport] = useState<any | null>(null);
  const [retentionRecords, setRetentionRecords] = useState<any[]>([]);
  const [retentionResourceType, setRetentionResourceType] = useState<string>('REPLAY');
  const [retentionResourceId, setRetentionResourceId] = useState<string>('');
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [retentionNotes, setRetentionNotes] = useState<string>('');
  const [isResolvingAlert, setIsResolvingAlert] = useState<boolean>(false);
  const [isApplyingRetention, setIsApplyingRetention] = useState<boolean>(false);

  // Tabs
  type Tab =
    | 'reviews'
    | 'shared-investigations'
    | 'analytics'
    | 'annotations'
    | 'activity'
    | 'sharing'
    | 'members'
    | 'roles-permissions'
    | 'policies'
    | 'replays'
    | 'security'
    | 'reporting';

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
      fetchReportingDetails(selectedWorkspaceId, selectedProjectId);
    }
  }, [selectedProjectId, selectedWorkspaceId]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportMetadata(selectedReportId);
    } else {
      setDeckData(null);
      setPdfLayout(null);
      setActiveSlideIndex(0);
      setExports([]);
      setShareTokens([]);
      setDistributions([]);
      setEvidenceLinks([]);
    }
  }, [selectedReportId]);

  useEffect(() => {
    if (selectedWorkspaceId && activeTab === 'analytics') {
      fetchAnalytics(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, activeTab]);

  useEffect(() => {
    if (selectedWorkspaceId && selectedInvestigationId && activeTab === 'shared-investigations') {
      fetchInvestigationAccesses(selectedWorkspaceId, selectedInvestigationId);
    }
  }, [selectedWorkspaceId, selectedInvestigationId, activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiFetch(`/organizations`);
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
      const [projRes, memberRes, actRes, inviteRes, sharedRes, roleRes, policyRes, securityRes, replayRes, accessRes] = await Promise.all([
        apiFetch(`/workspace/projects?workspaceId=${workspaceId}`),
        apiFetch(`/workspace/members?workspaceId=${workspaceId}`),
        apiFetch(`/workspace/activity?workspaceId=${workspaceId}`),
        apiFetch(`/workspace/invites?workspaceId=${workspaceId}`),
        apiFetch(`/workspace/investigations?workspaceId=${workspaceId}`),
        apiFetch(`/rbac/roles?workspaceId=${workspaceId}`),
        apiFetch(`/rbac/policies?workspaceId=${workspaceId}`),
        apiFetch(`/rbac/security?workspaceId=${workspaceId}`),
        apiFetch(`/rbac/replays?workspaceId=${workspaceId}`),
        apiFetch(`/rbac/access?workspaceId=${workspaceId}`)
      ]);

      const projData = await projRes.json();
      const memberData = await memberRes.json();
      const actData = await actRes.json();
      const inviteData = await inviteRes.json();
      const sharedData = await sharedRes.json();
      const roleData = await roleRes.json();
      const policyData = await policyRes.json();
      const securityData = await securityRes.json();
      const replayData = await replayRes.json();
      const accessData = await accessRes.json();

      setProjects(projData.projects || []);
      setMembers(memberData.members || []);
      setActivities(actData.feed || []);
      setInvites(inviteData.invites || []);
      setSharedInvestigations(sharedData.investigations || []);
      
      setRoles(roleData.roles || []);
      setPolicies(policyData.policies || []);
      setSecurityLogs(securityData.logs || []);
      setReplayScopes(replayData.scopes || []);
      setSharedGrants(accessData.grants || []);

      if (roleData.roles && roleData.roles.length > 0) {
        setSelectedRoleId(roleData.roles[0].id);
      }

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
      fetchSecurityCoreDetails(workspaceId);
    } catch (err: any) {
      console.error('Failed to load workspace parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityCoreDetails = async (workspaceId: string) => {
    try {
      const [auditRes, eventRes, alertRes, complianceRes] = await Promise.all([
        apiFetch(`/security/audit?workspaceId=${workspaceId}`),
        apiFetch(`/security/events?workspaceId=${workspaceId}`),
        apiFetch(`/security/alerts?workspaceId=${workspaceId}`),
        apiFetch(`/security/compliance?workspaceId=${workspaceId}`)
      ]);

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditEvents(auditData.logs || []);
      }
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setSecurityEvents(eventData.events || []);
      }
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setSecurityAlerts(alertData.alerts || []);
      }
      if (complianceRes.ok) {
        const complianceData = await complianceRes.json();
        setComplianceReport(complianceData.report || null);
      }
    } catch (err) {
      console.error('Failed to load security core parameters:', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      setIsResolvingAlert(true);
      const res = await apiFetch(`/security/alerts/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, workspaceId: selectedWorkspaceId })
      });
      if (res.ok) {
        fetchSecurityCoreDetails(selectedWorkspaceId);
      }
    } catch (err) {
      console.error('Failed to resolve security alert:', err);
    } finally {
      setIsResolvingAlert(false);
    }
  };

  const handleApplyRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retentionResourceId) return;
    try {
      setIsApplyingRetention(true);
      const res = await apiFetch(`/security/compliance/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          resourceType: retentionResourceType,
          resourceId: retentionResourceId,
          retentionDays,
          notes: retentionNotes
        })
      });
      if (res.ok) {
        setRetentionResourceId('');
        setRetentionNotes('');
        fetchSecurityCoreDetails(selectedWorkspaceId);
      }
    } catch (err) {
      console.error('Failed to apply retention policy:', err);
    } finally {
      setIsApplyingRetention(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const [revRes, annRes] = await Promise.all([
        apiFetch(`/workspace/reviews?projectId=${projectId}`),
        apiFetch(`/workspace/annotations?projectId=${projectId}`)
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
      const res = await apiFetch(`/workspace/analytics?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch workspace analytics:', err);
    }
  };

  const fetchInvestigationAccesses = async (workspaceId: string, sharedInvestigationId: string) => {
    try {
      const res = await apiFetch(`/rbac/investigations?workspaceId=${workspaceId}&sharedInvestigationId=${sharedInvestigationId}`
      );
      if (res.ok) {
        const data = await res.json();
        setInvestigationAccesses(data.accesses || []);
      }
    } catch (err) {
      console.error('Failed to fetch investigation accesses:', err);
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

    eventSource.addEventListener('workspace.reports.updated', () => {
      fetchReportingDetails(workspaceId, selectedProjectId);
    });

    eventSource.addEventListener('workspace.exports.progress', () => {
      if (selectedReportId) fetchReportMetadata(selectedReportId);
    });

    eventSource.addEventListener('workspace.digest.delivered', () => {
      fetchReportingDetails(workspaceId, selectedProjectId);
    });

    // RBAC Listeners
    eventSource.addEventListener('workspace.policy.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.roles.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.access.revoked', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.replay-sync.updated', () => {
      fetchWorkspaceDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.audit.updated', () => {
      fetchSecurityCoreDetails(workspaceId);
    });

    eventSource.addEventListener('workspace.security.alert', () => {
      fetchSecurityCoreDetails(workspaceId);
    });

    return () => {
      eventSource.close();
    };
  };

  const sendPresenceHeartbeat = async (workspaceId: string, screen = 'console') => {
    try {
      await apiFetch(`/workspace/presence`, {
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
      const res = await apiFetch(`/organizations`, {
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
      const res = await apiFetch(`/workspaces`, {
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
      const res = await apiFetch(`/workspace/invites`, {
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
      const res = await apiFetch(`/workspace/invites/accept`, {
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
      const res = await apiFetch(`/workspace/investigations`, {
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
      const res = await apiFetch(`/workspace/investigations/${selectedInvestigationId}/comments`, {
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
      const res = await apiFetch(`/workspace/annotations`, {
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
      const res = await apiFetch(`/workspace/annotations/${id}/resolve`, {
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
      const res = await apiFetch(`/workspace/annotations/${selectedAnnotationId}/comments`, {
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
      const res = await apiFetch(`/workspace/reviews/status`, {
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
      const res = await apiFetch(`/workspace/reviews/assign`, {
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
      const res = await apiFetch(`/sharing`, {
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

  // RBAC Custom handlers
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) return;

    try {
      const res = await apiFetch(`/rbac/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          roleName: customRoleName,
          description: customRoleDesc,
          permissions: [] // Start with empty permissions
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create custom role');
      }

      setCustomRoleName('');
      setCustomRoleDesc('');
      alert('Custom role created successfully!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCustomRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this custom role? This will revoke membership roles assigned to it.')) return;

    try {
      const res = await apiFetch(`/rbac/roles/${roleId}?workspaceId=${selectedWorkspaceId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      alert('Role deleted successfully!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdatePermissionOverride = async (
    roleId: string,
    domain: string,
    action: string,
    isAllowed: boolean
  ) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    // Check if role is custom. Built-in roles cannot be updated.
    if (['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(role.name)) {
      alert('Cannot update permissions on system default roles.');
      return;
    }

    try {
      // Find current permissions
      const currentPerms = role.permissions.map((p) => ({
        domain: p.domain,
        action: p.action,
        isAllowed: p.isAllowed
      }));

      // Update override
      const idx = currentPerms.findIndex((p) => p.domain === domain && p.action === action);
      if (idx !== -1) {
        currentPerms[idx].isAllowed = isAllowed;
      } else {
        currentPerms.push({ domain, action, isAllowed });
      }

      const res = await apiFetch(`/rbac/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          roleName: role.name,
          description: role.description,
          permissions: currentPerms
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update permissions');
      }

      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdatePolicy = async (key: string, value: string) => {
    try {
      const res = await apiFetch(`/rbac/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          key,
          value
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update policy');
      }

      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetInvestigationAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestigationId) return;

    try {
      const res = await apiFetch(`/rbac/investigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          sharedInvestigationId: selectedInvestigationId,
          accessorType: newAccessAccessorType,
          accessorId: newAccessAccessorId === 'PUBLIC' ? null : newAccessAccessorId,
          canRead: newAccessCanRead,
          canWrite: newAccessCanWrite
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set investigation access');
      }

      alert('Investigation access rule saved!');
      fetchInvestigationAccesses(selectedWorkspaceId, selectedInvestigationId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetReplayScope = async (sessionId: string, scopeType: string, allowedRoles: string[]) => {
    try {
      const res = await apiFetch(`/rbac/replays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          workflowSessionId: sessionId,
          scopeType,
          allowedRoles
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to configure scope');
      }

      alert('Replay visibility scope configured!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeExternalAccess = async (grantId: string) => {
    try {
      const res = await apiFetch(`/rbac/access/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          grantId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke shared grant');
      }

      alert('Access grant revoked successfully!');
      fetchWorkspaceDetails(selectedWorkspaceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchReportingDetails = async (workspaceId: string, projectId: string) => {
    try {
      const workspaceParam = workspaceId ? `workspaceId=${workspaceId}` : '';
      const projectParam = projectId ? `&projectId=${projectId}` : '';
      const listRes = await apiFetch(`/reports/executive/list?${workspaceParam}${projectParam}`);
      const listData = await listRes.json();
      setReports(listData.reports || []);

      const tempRes = await apiFetch(`/reports/templates?${workspaceParam}`);
      const tempData = await tempRes.json();
      setTemplates(tempData.templates || []);

      if (workspaceId) {
        const digRes = await apiFetch(`/reports/analytics/digests?workspaceId=${workspaceId}`);
        const digData = await digRes.json();
        setDigests(digData.digests || []);
      }
    } catch (err) {
      console.warn('Failed to load enterprise reporting elements', err);
    }
  };

  const fetchReportMetadata = async (reportId: string) => {
    try {
      const [deckRes, pdfRes, expRes, shareRes, distRes, evRes] = await Promise.all([
        apiFetch(`/reports/executive/${reportId}/deck`),
        apiFetch(`/reports/executive/${reportId}/pdf-layout`),
        apiFetch(`/reports/exports?reportId=${reportId}`),
        apiFetch(`/reports/sharing?reportId=${reportId}`),
        apiFetch(`/reports/distribution?reportId=${reportId}`),
        apiFetch(`/reports/evidence?reportId=${reportId}`)
      ]);

      const deckData = await deckRes.json();
      const pdfData = await pdfRes.json();
      const expData = await expRes.json();
      const shareData = await shareRes.json();
      const distData = await distRes.json();
      const evData = await evRes.json();

      setDeckData(deckData.deck || null);
      setPdfLayout(pdfData.pdfLayout || null);
      setExports(expData.exports || []);
      setShareTokens(shareData.shares || []);
      setDistributions(distData.distributions || []);
      setEvidenceLinks(evData.links || []);
    } catch (err) {
      console.warn('Failed to load report metadata details', err);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !selectedProjectId) return;

    try {
      setReportBuilding(true);
      const res = await apiFetch(`/reports/executive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId || null,
          projectId: selectedProjectId,
          title: reportTitle
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to compile report');
      }

      const data = await res.json();
      setReportTitle('');
      alert('Executive report compiled successfully!');
      setSelectedReportId(data.report.id);
      fetchReportingDetails(selectedWorkspaceId, selectedProjectId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReportBuilding(false);
    }
  };

  const handleCreateTemplate = async (name: string, description: string, layout: string) => {
    try {
      const res = await apiFetch(`/reports/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId || null,
          name,
          description,
          layoutType: layout,
          structure: {}
        })
      });

      if (!res.ok) throw new Error('Failed to create template');
      alert('Template created successfully!');
      fetchReportingDetails(selectedWorkspaceId, selectedProjectId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTriggerExport = async (format: string) => {
    if (!selectedReportId) return;

    try {
      setReportExporting(true);
      const res = await apiFetch(`/reports/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          format
        })
      });

      if (!res.ok) throw new Error('Failed to start export');
      fetchReportMetadata(selectedReportId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReportExporting(false);
    }
  };

  const handleGenerateReportShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;

    try {
      const res = await apiFetch(`/reports/sharing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          expiresHours: Number(newShareExpiresHours),
          maxUses: Number(newShareMaxUses),
          email: newShareEmail
        })
      });

      if (!res.ok) throw new Error('Failed to generate shared link');
      alert('Public shared link created!');
      setNewShareEmail('');
      fetchReportMetadata(selectedReportId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeReportShare = async (shareId: string) => {
    try {
      const res = await apiFetch(`/reports/sharing/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId })
      });

      if (!res.ok) throw new Error('Failed to revoke shared link');
      alert('Shared link revoked.');
      fetchReportMetadata(selectedReportId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDistributeReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;

    try {
      const res = await apiFetch(`/reports/distribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          channel: newDistributionChannel,
          recipient: newDistributionRecipient
        })
      });

      if (!res.ok) throw new Error('Failed to deliver report');
      alert('Report distributed successfully!');
      fetchReportMetadata(selectedReportId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateDigest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) return;

    try {
      const res = await apiFetch(`/reports/analytics/digests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          title: newDigestTitle,
          period: newDigestPeriod
        })
      });

      if (!res.ok) throw new Error('Failed to compile digest');
      alert('Workspace insight digest created!');
      fetchReportingDetails(selectedWorkspaceId, selectedProjectId);
    } catch (err: any) {
      alert(err.message);
    }
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
            { key: 'roles-permissions', label: 'Roles & Permissions', icon: Key },
            { key: 'policies', label: 'Governance Policies', icon: Settings },
            { key: 'replays', label: 'Replay Access Scopes', icon: Eye },
            { key: 'security', label: 'Trust, Security & Compliance', icon: Shield },
            { key: 'reporting', label: 'Enterprise Reporting', icon: FileText },
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
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
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

                {/* Scoped investigation visibility controls */}
                {selectedInvestigationId && (
                  <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#5ed29c]" /> Granular Investigation Access Rules
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mb-4">
                      Control which roles or specific users can view or comment on this shared investigation
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <form onSubmit={handleSetInvestigationAccess} className="flex flex-col gap-3 font-mono text-xs">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Accessor Type</label>
                          <select
                            value={newAccessAccessorType}
                            onChange={(e) => setNewAccessAccessorType(e.target.value)}
                            className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                          >
                            <option value="ROLE">Workspace Role</option>
                            <option value="MEMBER">Specific Team Member</option>
                            <option value="PUBLIC">Workspace Public (Anyone)</option>
                          </select>
                        </div>

                        {newAccessAccessorType !== 'PUBLIC' && (
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Target Name</label>
                            <select
                              value={newAccessAccessorId}
                              onChange={(e) => setNewAccessAccessorId(e.target.value)}
                              className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                            >
                              {newAccessAccessorType === 'ROLE' ? (
                                <>
                                  <option value="ANALYST">Analyst</option>
                                  <option value="VIEWER">Viewer</option>
                                  <option value="GUEST">Guest</option>
                                  {roles.filter(r => !['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(r.name)).map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                  ))}
                                </>
                              ) : (
                                members.map(m => (
                                  <option key={m.id} value={m.id}>{m.user.name || m.user.email}</option>
                                ))
                              )}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAccessCanRead}
                              onChange={(e) => setNewAccessCanRead(e.target.checked)}
                              className="accent-[#5ed29c]"
                            />
                            <span>Can Read</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAccessCanWrite}
                              onChange={(e) => setNewAccessCanWrite(e.target.checked)}
                              className="accent-[#5ed29c]"
                            />
                            <span>Can Write/Comment</span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-1.5 rounded-xl transition-all"
                        >
                          Save Access Rule
                        </button>
                      </form>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-black block mb-2">Active Rules Ledger</span>
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border border-[#222226] rounded-xl p-3 divide-y divide-[#222226]">
                          {investigationAccesses.length === 0 ? (
                            <div className="text-zinc-600 text-[10px] italic">No overrides. Shared workspace default visibility active.</div>
                          ) : (
                            investigationAccesses.map((rule: any) => (
                              <div key={rule.id} className="text-[11px] py-2 flex items-center justify-between text-zinc-400">
                                <div>
                                  <span className="text-white font-bold">{rule.accessorType}</span>
                                  {rule.accessorId && <span className="text-[9px] text-[#5ed29c] ml-1 bg-[#5ed29c]/5 border border-[#5ed29c]/15 px-1 rounded">{rule.accessorId}</span>}
                                </div>
                                <div className="flex gap-2">
                                  {rule.canRead && <span className="text-emerald-400">READ</span>}
                                  {rule.canWrite && <span className="text-sky-400">WRITE</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
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
            <div className="flex flex-col gap-6">
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

              {/* Shared Access Grants Table */}
              <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5ed29c]" /> Active External Shared Grants
                </h3>
                <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                  Verify or revoke external stakeholder sharing permissions
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#222226] text-left text-zinc-500 text-[10px] uppercase font-black">
                        <th className="py-2 pr-4">Resource</th>
                        <th className="py-2 px-4">Grantee Email</th>
                        <th className="py-2 px-4">Expires At</th>
                        <th className="py-2 pl-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222226]/50">
                      {sharedGrants.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-zinc-600 italic">
                            Zero active external grants.
                          </td>
                        </tr>
                      ) : (
                        sharedGrants.map((g) => (
                          <tr key={g.id} className="hover:bg-[#18181b]/30">
                            <td className="py-3 pr-4 text-white font-bold">{g.resourceType} ({g.resourceId.substring(0, 8)})</td>
                            <td className="py-3 px-4 text-[#5ed29c] font-bold">{g.granteeEmail || 'Anonymous Link'}</td>
                            <td className="py-3 px-4 text-zinc-500">
                              {g.expiresAt ? new Date(g.expiresAt).toLocaleString() : 'Never'}
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <button
                                onClick={() => handleRevokeExternalAccess(g.id)}
                                className="text-red-400 hover:bg-red-950/20 border border-red-500/10 px-2 py-1 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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

          {/* TAB 8: ROLES & PERMISSIONS */}
          {activeTab === 'roles-permissions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Roles Directory */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#5ed29c]" /> Permission Console
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                    Configure granular permissions checklist across custom roles
                  </p>

                  <div className="flex flex-col gap-4">
                    {roles.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRoleId(r.id)}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedRoleId === r.id
                            ? 'bg-[#18181b] border-[#5ed29c]/40 shadow-lg shadow-[#5ed29c]/5'
                            : 'bg-[#18181b]/60 border-[#2d2d30] hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-white font-mono">{r.name}</h4>
                          {!['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(r.name) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomRole(r.id);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">{r.description || 'System-defined default workspace role.'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit Selected Role Permissions Overrides */}
                {selectedRoleId && (() => {
                  const role = roles.find((r) => r.id === selectedRoleId);
                  if (!role) return null;
                  const isSystemDefault = ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'GUEST'].includes(role.name);

                  return (
                    <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                      <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#5ed29c]" /> Permissions Matrix override: <span className="text-[#5ed29c] font-black">{role.name}</span>
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                        {isSystemDefault ? 'System role permissions are read-only' : 'Grant or revoke domain abilities using checkboxes below'}
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse font-mono text-xs">
                          <thead>
                            <tr className="border-b border-[#222226] text-left text-zinc-500 text-[10px] uppercase font-black">
                              <th className="py-2 pr-4">Domain Area</th>
                              <th className="py-2 px-4 text-center">READ</th>
                              <th className="py-2 px-4 text-center">WRITE</th>
                              <th className="py-2 px-4 text-center">EXECUTE</th>
                              <th className="py-2 px-4 text-center">MANAGE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#222226]/50">
                            {(['WORKSPACE', 'PROJECT', 'INVESTIGATION', 'REPLAY', 'ANALYTICS', 'SWARM', 'EXPORT', 'TEAM'] as const).map((domain) => {
                              return (
                                <tr key={domain} className="hover:bg-[#18181b]/30">
                                  <td className="py-3 pr-4 text-white font-bold">{domain}</td>
                                  {(['READ', 'WRITE', 'EXECUTE', 'MANAGE'] as const).map((action) => {
                                    let isAllowed = false;
                                    if (role.name === 'OWNER' || role.name === 'ADMIN') {
                                      isAllowed = true;
                                    } else if (role.name === 'VIEWER') {
                                      isAllowed = action === 'READ';
                                    } else if (role.name === 'ANALYST') {
                                      isAllowed = !(domain === 'TEAM' || domain === 'WORKSPACE' ? action !== 'READ' : false);
                                    } else if (role.name === 'GUEST') {
                                      isAllowed = domain === 'INVESTIGATION' ? (action === 'READ' || action === 'WRITE') : (domain === 'REPLAY' && action === 'READ');
                                    } else {
                                      const override = role.permissions.find(p => p.domain === domain && p.action === action);
                                      isAllowed = override ? override.isAllowed : false;
                                    }

                                    return (
                                      <td key={action} className="py-3 px-4 text-center">
                                        <input
                                          type="checkbox"
                                          disabled={isSystemDefault}
                                          checked={isAllowed}
                                          onChange={(e) => handleUpdatePermissionOverride(role.id, domain, action, e.target.checked)}
                                          className="accent-[#5ed29c] cursor-pointer disabled:cursor-not-allowed"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Create Custom Role form */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-[#121214] border border-[#222226] rounded-xl p-5">
                  <h4 className="text-xs font-black font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#5ed29c]" /> Create Custom Role
                  </h4>
                  <form onSubmit={handleCreateCustomRole} className="flex flex-col gap-4 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Role Name</label>
                      <input
                        type="text"
                        placeholder="e.g. SPECIALIST"
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Purpose of this custom role..."
                        value={customRoleDesc}
                        onChange={(e) => setCustomRoleDesc(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] font-black uppercase text-[10px] py-2 rounded-xl transition-all"
                    >
                      Publish Custom Role
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: GOVERNANCE POLICIES */}
          {activeTab === 'policies' && (
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 animate-fadeIn">
              <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#5ed29c]" /> Workspace Policy Settings
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                Configure organization-level access policy boundaries
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {[
                  {
                    key: 'inviteRestrictions',
                    title: 'Workspace Invite Controls',
                    desc: 'Restricts who can invite new team members into the workspace',
                    options: [
                      { value: 'OWNER_ONLY', label: 'Owner Only' },
                      { value: 'ADMIN_ONLY', label: 'Owner & Admin Only' },
                      { value: 'ENABLED', label: 'All Members' }
                    ]
                  },
                  {
                    key: 'externalSharing',
                    title: 'External Sharing Rules',
                    desc: 'Allows or disallows generating public URLs to share UX visual replays externally',
                    options: [
                      { value: 'ENABLED', label: 'Allow External Links' },
                      { value: 'DISABLED', label: 'Disable External Links' }
                    ]
                  },
                  {
                    key: 'guestAccess',
                    title: 'Guest Workspace Access',
                    desc: 'Enables or restricts inviting external Guest users with scoped visibility permissions',
                    options: [
                      { value: 'ENABLED', label: 'Guest Access Allowed' },
                      { value: 'DISABLED', label: 'No Guests Allowed' }
                    ]
                  },
                  {
                    key: 'replaySharing',
                    title: 'Replay Session Sharing',
                    desc: 'Defines visibility constraints of recorded visual sessions by default',
                    options: [
                      { value: 'PUBLIC', label: 'Workspace Public' },
                      { value: 'WORKSPACE', label: 'Workspace Only' },
                      { value: 'PRIVATE', label: 'Private (Owner/Admin Only)' }
                    ]
                  },
                  {
                    key: 'exportRestrictions',
                    title: 'PDF & Data Exports',
                    desc: 'Grants export rights of UX insights and stability drift metrics to members',
                    options: [
                      { value: 'ENABLED', label: 'All roles can export' },
                      { value: 'ADMIN_ONLY', label: 'Admins & Owners only' }
                    ]
                  },
                  {
                    key: 'workspaceVisibility',
                    title: 'Workspace Discovery',
                    desc: 'Limits workspace searchability to internal organization members',
                    options: [
                      { value: 'PRIVATE', label: 'Private Workspace' },
                      { value: 'PUBLIC', label: 'Searchable Org Hub' }
                    ]
                  }
                ].map((policy) => {
                  const activePolicy = policies.find(p => p.key === policy.key);
                  const activeVal = activePolicy ? activePolicy.value : '';

                  return (
                    <div key={policy.key} className="bg-[#18181b] border border-[#2d2d30] p-4 rounded-xl flex flex-col justify-between">
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-white font-mono mb-1">{policy.title}</h4>
                        <p className="text-[10.5px] text-zinc-400 font-sans">{policy.desc}</p>
                      </div>

                      <div className="flex gap-2 font-mono text-[9px] font-black uppercase">
                        {policy.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleUpdatePolicy(policy.key, opt.value)}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                              activeVal === opt.value
                                ? 'bg-[#5ed29c]/15 text-[#5ed29c] border-[#5ed29c]/25'
                                : 'bg-[#121214] text-zinc-500 border-transparent hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 10: REPLAY ACCESS RULES */}
          {activeTab === 'replays' && (
            <div className="bg-[#121214] border border-[#222226] rounded-xl p-5 animate-fadeIn">
              <h3 className="text-xs font-black font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#5ed29c]" /> Replay Sensitivity Controls
              </h3>
              <p className="text-[10px] font-mono text-zinc-500 mb-4 uppercase">
                Audit visual replay access scopes to secure sensitive transaction paths
              </p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#222226] text-left text-zinc-500 text-[10px] uppercase font-black">
                      <th className="py-2.5 pr-4">Replay Session</th>
                      <th className="py-2.5 px-4">Active Scope</th>
                      <th className="py-2.5 px-4">Allowed Roles</th>
                      <th className="py-2.5 pl-4 text-right">Configure Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222226]/50">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-600 italic">
                          No replay sessions available in current workspace.
                        </td>
                      </tr>
                    ) : (
                      reviews.map((r) => {
                        const scope = replayScopes.find(s => s.workflowSessionId === r.workflowSessionId);
                        const activeScopeType = scope ? scope.scopeType : 'WORKSPACE';
                        const allowedRoles = scope ? scope.allowedRoles : ['OWNER', 'ADMIN', 'ANALYST'];

                        return (
                          <tr key={r.id} className="hover:bg-[#18181b]/30">
                            <td className="py-3 pr-4">
                              <span className="text-white font-bold block">{r.workflowSession.goal || 'General Run'}</span>
                              <span className="text-[9.5px] text-zinc-500">ID: {r.workflowSessionId.substring(0, 8)}...</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                                activeScopeType === 'PRIVATE' ? 'bg-red-950/20 text-red-400 border border-red-500/20' :
                                activeScopeType === 'PROJECT' ? 'bg-sky-950/20 text-sky-400 border border-sky-500/20' :
                                activeScopeType === 'PUBLIC' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {activeScopeType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-400">
                              {allowedRoles.join(', ')}
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {(['WORKSPACE', 'PRIVATE', 'PUBLIC'] as const).map((scopeType) => (
                                  <button
                                    key={scopeType}
                                    onClick={() => handleSetReplayScope(r.workflowSessionId, scopeType, allowedRoles)}
                                    className={`px-2 py-1 rounded text-[9px] uppercase font-black border transition-all ${
                                      activeScopeType === scopeType
                                        ? 'bg-[#5ed29c]/15 text-[#5ed29c] border-[#5ed29c]/25'
                                        : 'bg-[#1c1c1f] text-zinc-500 border-transparent hover:text-white'
                                    }`}
                                  >
                                    {scopeType}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: SECURITY & COMPLIANCE OPERATIONS CONTROL CENTER */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs text-zinc-300">
              
              {/* Left Column: Compliance Score & Policy Controls */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* SOC2 Compliance Readiness Gauge */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#5ed29c]" /> SOC2 Readiness Index
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase mb-4">Continuous security standards checkpoint</p>
                  
                  {complianceReport ? (
                    <div className="flex flex-col items-center py-4 border-b border-[#222226] mb-4">
                      <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-[#222226]">
                        <div className="absolute inset-2 rounded-full border border-[#222226] border-dashed"></div>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-[#5ed29c] tracking-tight">{complianceReport.score}%</span>
                          <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">Compliant</span>
                        </div>
                      </div>
                      
                      <div className="w-full mt-4 flex flex-col gap-1.5">
                        {complianceReport.items.map((item: any) => (
                          <div key={item.key} className="flex items-start justify-between gap-3 bg-[#18181b] border border-[#222226] p-2 rounded-lg">
                            <div>
                              <span className="text-[9.5px] text-white font-bold block">{item.name}</span>
                              <span className="text-[8.5px] text-zinc-500 block leading-tight mt-0.5">{item.description}</span>
                              {item.actionRequired && (
                                <span className="text-[8px] text-amber-500 block mt-1 leading-normal bg-amber-950/20 border border-amber-500/20 px-1 py-0.5 rounded">
                                  {item.actionRequired}
                                </span>
                              )}
                            </div>
                            <span className={`text-[8.5px] font-black uppercase px-1 py-0.5 rounded shrink-0 border mt-0.5 ${
                              item.status === 'COMPLIANT'
                                ? 'bg-emerald-950/20 text-[#5ed29c] border-[#5ed29c]/20'
                                : 'bg-amber-950/20 text-amber-500 border-amber-500/20'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600 italic">No compliance checkpoints run.</p>
                  )}
                  
                  <span className="text-[8px] text-zinc-600 uppercase block text-center">
                    Checked: {complianceReport ? new Date(complianceReport.checkedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                {/* Compliance Data Retention Policies */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#5ed29c]" /> Data Retention Controls
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase mb-3">Schedule archival scopes for workflow intelligence</p>
                  
                  <form onSubmit={handleApplyRetention} className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <select
                        value={retentionResourceType}
                        onChange={(e) => setRetentionResourceType(e.target.value)}
                        className="flex-1 bg-[#1c1c1f] border border-[#2d2d30] text-[10px] text-white px-2 py-1.5 rounded focus:outline-none"
                      >
                        <option value="REPLAY">Session Replay</option>
                        <option value="REPORT">Compiled Report</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Days"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(parseInt(e.target.value) || 90)}
                        className="w-16 bg-[#1c1c1f] border border-[#2d2d30] text-[10px] text-white px-2 py-1.5 rounded focus:outline-none text-center"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Resource Target ID"
                      value={retentionResourceId}
                      onChange={(e) => setRetentionResourceId(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-[10px] text-white px-2 py-1.5 rounded focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Retention Notes / Rationale"
                      value={retentionNotes}
                      onChange={(e) => setRetentionNotes(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-[10px] text-white px-2 py-1.5 rounded focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingRetention}
                      className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] py-1.5 rounded text-[9.5px] font-black uppercase transition-all"
                    >
                      {isApplyingRetention ? 'Applying...' : 'Apply Retention Rule'}
                    </button>
                  </form>

                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto mt-3">
                    <span className="text-[8.5px] text-zinc-500 uppercase font-black">Retention Schedules</span>
                    {retentionRecords.length === 0 ? (
                      <span className="text-[9px] text-zinc-600 italic">No retention overrides configured.</span>
                    ) : (
                      retentionRecords.map((rec) => (
                        <div key={rec.id} className="bg-[#18181b] border border-[#222226] p-2 rounded-lg text-[9px] text-zinc-400">
                          <div className="flex justify-between items-center font-bold">
                            <span>{rec.resourceType}: {rec.resourceId.substring(0, 8)}...</span>
                            <span className="text-[#5ed29c]">{rec.retentionDays}d</span>
                          </div>
                          <span className="text-[8px] text-zinc-500 block mt-0.5">Expires: {new Date(rec.expiresAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Middle/Right Column: Operational Logs & Security Alerts */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Active Alerts Mitigation Panel */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Active Security Alerts
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase mb-3">Mitigation required for threat signals</p>
                  
                  {securityAlerts.filter(a => !a.resolved).length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 font-mono text-[10px] italic border border-dashed border-[#222226] rounded-xl">
                      No active unresolved security incidents logged.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {securityAlerts.filter(a => !a.resolved).map((alert) => (
                        <div key={alert.id} className="bg-[#18181b] border border-red-500/20 p-4 rounded-xl flex items-start gap-4 hover:border-red-500/40 transition-all">
                          <div className="mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 block animate-pulse"></span>
                          </div>
                          
                          <div className="flex-1 font-mono text-xs">
                            <div className="flex justify-between items-center mb-1 text-[9px] text-zinc-500 font-black uppercase">
                              <span className="text-red-400 bg-red-950/20 border border-red-500/20 px-1.5 py-0.5 rounded">
                                {alert.alertType}
                              </span>
                              <span>{new Date(alert.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-zinc-200 font-bold mb-2">{alert.description}</p>
                            <button
                              type="button"
                              onClick={() => handleResolveAlert(alert.id)}
                              disabled={isResolvingAlert}
                              className="bg-emerald-950/30 hover:bg-emerald-900/40 text-[#5ed29c] border border-[#5ed29c]/20 px-2 py-1 rounded text-[9px] uppercase font-black transition-all"
                            >
                              Resolve Incident
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Timeline Viewer */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#5ed29c]" /> Workspace Audit Timeline
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase mb-3">Chronological operational audit log</p>
                  
                  {auditEvents.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 italic uppercase">No audit logs registered.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto border border-[#222226] p-3 rounded-lg bg-[#18181b]/50">
                      {auditEvents.map((evt) => (
                        <div key={evt.id} className="border-b border-[#222226] pb-2 last:border-b-0 last:pb-0 text-[10.5px]">
                          <div className="flex justify-between items-center mb-1 text-[8.5px] text-zinc-500 uppercase">
                            <span className="font-bold text-white bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                              {evt.action}
                            </span>
                            <span>{new Date(evt.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-zinc-300 font-sans mt-0.5">{evt.description}</p>
                          {evt.user && (
                            <span className="text-[8.5px] text-zinc-500 uppercase tracking-wider block mt-1 font-mono">
                              Actor: {evt.user.name || evt.user.email}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Access Traceability Log */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#5ed29c]" /> Access Trace accountability
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase mb-3">Replay read & export trace details</p>
                  
                  {sharedGrants.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 italic uppercase">No access grants generated.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {sharedGrants.map((grant) => (
                        <div key={grant.id} className="bg-[#18181b] border border-[#2d2d30] p-3 rounded-lg text-[9.5px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded text-[8.5px] uppercase">
                              {grant.resourceType} Shared Token
                            </span>
                            <span className="text-zinc-500 font-mono text-[8px]">
                              Created: {new Date(grant.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-zinc-400 font-mono">Resource ID: {grant.resourceId.substring(0, 16)}...</p>
                          {grant.granteeEmail && (
                            <span className="text-[9.5px] text-[#5ed29c] font-bold block mt-1">Recipient: {grant.granteeEmail}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 12: ENTERPRISE REPORTING CONSOLE */}
          {activeTab === 'reporting' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs text-zinc-300">
              
              {/* Left Column: Report List & Creators */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Executive Report List */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#5ed29c]" /> Compiled Reports
                  </h3>
                  
                  {reports.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 italic uppercase">No compiled reports for project.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {reports.map((rep) => (
                        <button
                          key={rep.id}
                          onClick={() => setSelectedReportId(rep.id)}
                          className={`w-full text-left p-3 rounded-lg border text-xs font-bold uppercase transition-all ${
                            selectedReportId === rep.id
                              ? 'bg-[#5ed29c]/10 text-white border-[#5ed29c]/30'
                              : 'bg-[#18181b] border-[#222226] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white truncate max-w-[150px]">{rep.title}</span>
                            <span className={`text-[8px] px-1 py-0.5 rounded ${
                              rep.riskLevel === 'CRITICAL' ? 'bg-red-950/20 text-red-400 border border-red-500/20' :
                              rep.riskLevel === 'HIGH' ? 'bg-amber-950/20 text-amber-400 border border-amber-500/20' :
                              'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {rep.riskLevel}
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-500">
                            Score: {rep.stabilityScore}/100 • {new Date(rep.createdAt).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compile New Report */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-3 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#5ed29c]" /> Compile Report
                  </h3>
                  <form onSubmit={handleCreateReport} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase block mb-1">Report Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Q3 Release Readiness Audit"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={reportBuilding || !reportTitle.trim()}
                      className="w-full bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] py-2 rounded-lg font-black uppercase text-[10px] transition-all disabled:opacity-50"
                    >
                      {reportBuilding ? 'COMPILING INTELLIGENCE...' : 'GENERATE REPORT'}
                    </button>
                  </form>
                </div>

                {/* Templates Manager */}
                <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-white mb-3 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-[#5ed29c]" /> Report Templates
                  </h3>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3">
                    {templates.map((temp) => (
                      <div key={temp.id} className="bg-[#18181b] border border-[#222226] p-2.5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-bold">{temp.name}</span>
                          <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded">{temp.layoutType}</span>
                        </div>
                        {temp.description && <p className="text-[9px] text-zinc-500 leading-normal">{temp.description}</p>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-[#222226] pt-3 flex flex-col gap-2">
                    <span className="text-[9px] text-zinc-500 uppercase">Create Custom Template</span>
                    <button
                      type="button"
                      onClick={() => handleCreateTemplate('Standard UX Release Audit', 'Modular design layout tracking regressions and completion deltas.', 'PRODUCT_RELEASE')}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 rounded-lg border border-[#333] text-[9px] uppercase font-black"
                    >
                      Create Release Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Canvas: Report Details, Slides, PDF, Sharing */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {selectedReportId ? (() => {
                  const activeReport = reports.find(r => r.id === selectedReportId);
                  if (!activeReport) return null;

                  return (
                    <>
                      {/* Report Executive Overview */}
                      <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                        <div className="flex items-center justify-between border-b border-[#222226] pb-3 mb-4">
                          <div>
                            <h2 className="text-sm font-black text-white uppercase">{activeReport.title}</h2>
                            <p className="text-[9px] text-zinc-500 uppercase mt-0.5">
                              ID: {activeReport.id.substring(0, 8)}... • Created By: {activeReport.createdBy?.name || activeReport.createdById}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-zinc-500 uppercase">Risk Rating:</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              activeReport.riskLevel === 'CRITICAL' ? 'bg-red-950/20 text-red-400 border border-red-500/20' :
                              activeReport.riskLevel === 'HIGH' ? 'bg-amber-950/20 text-amber-400 border border-amber-500/20' :
                              'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {activeReport.riskLevel}
                            </span>
                          </div>
                        </div>

                        {/* Metric Gauges */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                          <div className="bg-[#18181b] border border-[#222226] p-3 rounded-lg text-center">
                            <span className="text-[8px] text-zinc-500 uppercase font-black block mb-1">Stability Rating</span>
                            <span className="text-lg font-black text-white">{activeReport.stabilityScore}/100</span>
                          </div>
                          <div className="bg-[#18181b] border border-[#222226] p-3 rounded-lg text-center">
                            <span className="text-[8px] text-zinc-500 uppercase font-black block mb-1">Completion Rate</span>
                            <span className="text-lg font-black text-[#5ed29c]">{Math.round(activeReport.completionRate * 100)}%</span>
                          </div>
                          <div className="bg-[#18181b] border border-[#222226] p-3 rounded-lg text-center">
                            <span className="text-[8px] text-zinc-500 uppercase font-black block mb-1">Friction Alerts</span>
                            <span className="text-lg font-black text-amber-400">
                              {Array.isArray(activeReport.sections) ? activeReport.sections.find((s: any) => s.type === 'RISK_OVERVIEW')?.metadata?.highCount || 0 : 0}
                            </span>
                          </div>
                          <div className="bg-[#18181b] border border-[#222226] p-3 rounded-lg text-center">
                            <span className="text-[8px] text-zinc-500 uppercase font-black block mb-1">Evidence Links</span>
                            <span className="text-lg font-black text-sky-400">{evidenceLinks.length} Files</span>
                          </div>
                        </div>

                        <div className="bg-[#18181b] border border-[#222226] p-4 rounded-lg">
                          <span className="text-[10px] text-zinc-500 uppercase font-black block mb-2">Executive Summary Narrative</span>
                          <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">{activeReport.summary}</p>
                        </div>
                      </div>

                      {/* Presentation slide-deck previewer */}
                      {deckData && (
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <div className="flex items-center justify-between mb-3 border-b border-[#222226] pb-3">
                            <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                              <Layout className="w-4 h-4 text-[#5ed29c]" /> Slide Presentation Reviewer
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                                disabled={activeSlideIndex === 0}
                                className="bg-zinc-800 border border-[#333] hover:bg-zinc-700 text-white text-[9px] uppercase font-black px-2 py-1 rounded disabled:opacity-50"
                              >
                                Prev
                              </button>
                              <span className="text-[10px] text-zinc-500 font-bold">
                                {activeSlideIndex + 1} / {deckData.slides.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveSlideIndex(prev => Math.min(deckData.slides.length - 1, prev + 1))}
                                disabled={activeSlideIndex === deckData.slides.length - 1}
                                className="bg-zinc-800 border border-[#333] hover:bg-zinc-700 text-white text-[9px] uppercase font-black px-2 py-1 rounded disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          {/* Slide Panel Display */}
                          <div className="bg-[#18181b] border border-[#2d2d30] aspect-[16/9] rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                            {/* Accent indicator */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${deckData.theme === 'DARK_ALERT' ? 'bg-red-500' : 'bg-[#5ed29c]'}`}></div>
                            
                            <div>
                              <span className="text-[9px] text-[#5ed29c] font-black tracking-widest uppercase block mb-1">
                                {deckData.deckTitle}
                              </span>
                              <h4 className="text-base font-black text-white uppercase mb-4">
                                {deckData.slides[activeSlideIndex]?.title}
                              </h4>
                              
                              <div className="flex flex-col gap-2.5">
                                {deckData.slides[activeSlideIndex]?.elements.map((el: any, elIdx: number) => {
                                  if (el.type === 'METRICS_GRID') {
                                    return (
                                      <div key={elIdx} className="grid grid-cols-3 gap-3 border border-[#222226] p-3 rounded-lg bg-black/45 mt-2">
                                        {Object.entries(el.content).map(([k, v]: any) => (
                                          <div key={k} className="text-center">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black block">{k}</span>
                                            <span className="text-xs font-black text-white">{v}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return (
                                    <p key={elIdx} className="text-xs text-zinc-300 leading-relaxed font-sans">
                                      {el.content}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[8px] text-zinc-600 font-bold uppercase tracking-wider">
                              <span>Fricta board-level report builder</span>
                              <span>Slide {activeSlideIndex + 1}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PDF layout preview */}
                      {pdfLayout && (
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <h3 className="text-xs font-black uppercase text-white mb-3 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-[#5ed29c]" /> Boardroom PDF Blueprint
                          </h3>
                          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto border border-[#222226] rounded-lg p-3">
                            {pdfLayout.pages.map((p: any) => (
                              <div key={p.pageNumber} className="bg-[#18181b] border border-[#2d2d30] p-4 rounded-lg flex flex-col justify-between min-h-[140px] relative">
                                <div className="text-[8.5px] text-zinc-500 uppercase tracking-widest border-b border-[#222226]/50 pb-1.5 mb-2.5 flex justify-between">
                                  <span>{p.header}</span>
                                  <span>Page {p.pageNumber}</span>
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                  {p.elements.map((el: any, elIdx: number) => (
                                    <div key={elIdx} className="text-zinc-300 font-mono text-[10.5px]">
                                      {el.type === 'TITLE' && <span className="text-white font-black text-xs block">{el.value}</span>}
                                      {el.type === 'SECTION_HEADER' && <span className="text-[#5ed29c] font-bold block mt-1">{el.value}</span>}
                                      {el.type === 'PARAGRAPH' && <p className="font-sans text-[10px] text-zinc-400 mt-1">{el.value}</p>}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-[8px] text-zinc-600 text-right mt-3 uppercase tracking-wider">{p.footer}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Export Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5 text-[#5ed29c]" /> Document Exports
                          </h3>
                          <p className="text-[9.5px] text-zinc-500 uppercase mb-4">Export static snapshots</p>
                          <div className="flex gap-2 mb-4">
                            <button
                              type="button"
                              onClick={() => handleTriggerExport('PDF')}
                              disabled={reportExporting}
                              className="flex-1 bg-zinc-800 border border-[#333] hover:bg-zinc-700 text-white text-[9.5px] uppercase font-black py-2 rounded-lg"
                            >
                              Export PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTriggerExport('PRESENTATION')}
                              disabled={reportExporting}
                              className="flex-1 bg-zinc-800 border border-[#333] hover:bg-zinc-700 text-white text-[9.5px] uppercase font-black py-2 rounded-lg"
                            >
                              Export Slide Deck
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto border border-[#222226] p-2.5 rounded-lg">
                            <span className="text-[8.5px] text-zinc-500 uppercase font-black">History</span>
                            {exports.length === 0 ? (
                              <span className="text-[9px] text-zinc-600 italic">No previous exports.</span>
                            ) : (
                              exports.map((e) => (
                                <div key={e.id} className="flex justify-between items-center text-[10px] py-1 text-zinc-400 font-mono">
                                  <span>{e.format} ({e.status})</span>
                                  {e.status === 'COMPLETED' && e.filePath && (
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(e.filePath)}
                                      className="text-[#5ed29c] hover:underline"
                                    >
                                      Copy Path
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Public Link Sharing */}
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5 text-[#5ed29c]" /> Token Share Links
                          </h3>
                          <p className="text-[9.5px] text-zinc-500 uppercase mb-3">Distribute secure public tokens</p>
                          <form onSubmit={handleGenerateReportShare} className="flex flex-col gap-2 mb-4">
                            <input
                              type="email"
                              placeholder="Recipient Email (optional)"
                              value={newShareEmail}
                              onChange={(e) => setNewShareEmail(e.target.value)}
                              className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2 py-1 rounded text-[10px] focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] py-1.5 rounded text-[9.5px] font-black uppercase"
                            >
                              Generate Access Token
                            </button>
                          </form>
                          
                          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                            {shareTokens.map((st) => (
                              <div key={st.id} className="bg-[#18181b] border border-[#222226] p-2 rounded flex items-center justify-between">
                                <div className="truncate flex-1 pr-3">
                                  <span className="text-white block font-bold truncate">Token: {st.token.substring(0, 12)}...</span>
                                  <span className="text-[8px] text-zinc-500 uppercase">Uses: {st.useCount} {st.maxUses ? `/ ${st.maxUses}` : ''}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeReportShare(st.id)}
                                  className="text-red-400 hover:text-red-300 font-bold uppercase text-[9px]"
                                >
                                  Revoke
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Delivery and Workspace digest compiler */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Report Webhook Distribution */}
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#5ed29c]" /> Webhook & Email Delivery
                          </h3>
                          <p className="text-[9.5px] text-zinc-500 uppercase mb-3">Distribute report via integrations</p>
                          <form onSubmit={handleDistributeReport} className="flex flex-col gap-2">
                            <select
                              value={newDistributionChannel}
                              onChange={(e) => setNewDistributionChannel(e.target.value)}
                              className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2 py-1 rounded text-[10px] focus:outline-none"
                            >
                              <option value="EMAIL">Email Address</option>
                              <option value="WEBHOOK">Slack Webhook URL</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Webhook URL or Email"
                              value={newDistributionRecipient}
                              onChange={(e) => setNewDistributionRecipient(e.target.value)}
                              className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2 py-1 rounded text-[10px] focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] py-1.5 rounded text-[9.5px] font-black uppercase"
                            >
                              Trigger Dispatch
                            </button>
                          </form>
                          
                          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto mt-4 border border-[#222226] p-2.5 rounded-lg">
                            <span className="text-[8.5px] text-zinc-500 uppercase font-black block mb-1">Delivered Events Log</span>
                            {distributions.length === 0 ? (
                              <span className="text-[9px] text-zinc-600 italic">No distribution events logged.</span>
                            ) : (
                              distributions.map((d) => (
                                <div key={d.id} className="flex justify-between items-center text-[9px] text-zinc-400 font-mono">
                                  <span>{d.channel}: {d.recipient.substring(0, 16)}...</span>
                                  <span className={d.status === 'SENT' ? 'text-emerald-400' : 'text-red-400'}>{d.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Workspace Health Digests */}
                        <div className="bg-[#121214] border border-[#222226] p-5 rounded-xl">
                          <h3 className="text-xs font-black uppercase text-white mb-2 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#5ed29c]" /> Workspace Insight Digests
                          </h3>
                          <p className="text-[9.5px] text-zinc-500 uppercase mb-3">Compile cross-project stability metrics</p>
                          
                          {selectedWorkspaceId ? (
                            <form onSubmit={handleGenerateDigest} className="flex flex-col gap-2 mb-4">
                              <input
                                type="text"
                                placeholder="Digest Title"
                                value={newDigestTitle}
                                onChange={(e) => setNewDigestTitle(e.target.value)}
                                className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2 py-1 rounded text-[10px] focus:outline-none"
                              />
                              <select
                                value={newDigestPeriod}
                                onChange={(e) => setNewDigestPeriod(e.target.value)}
                                className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-white px-2 py-1 rounded text-[10px] focus:outline-none"
                              >
                                <option value="DAILY">Daily Audit</option>
                                <option value="WEEKLY">Weekly Audit</option>
                                <option value="MONTHLY">Monthly Audit</option>
                              </select>
                              <button
                                type="submit"
                                className="bg-[#5ed29c]/10 border border-[#5ed29c]/20 hover:bg-[#5ed29c]/20 text-[#5ed29c] py-1.5 rounded text-[9.5px] font-black uppercase"
                              >
                                Compile Workspace Digest
                              </button>
                            </form>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic mb-4">Select active workspace to generate Digests.</p>
                          )}
                          
                          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                            {digests.map((d) => (
                              <div key={d.id} className="bg-[#18181b] border border-[#222226] p-2.5 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white font-bold">{d.title}</span>
                                  <span className="text-[8px] bg-zinc-800 text-[#5ed29c] px-1 py-0.5 rounded">{d.digestPeriod}</span>
                                </div>
                                <div className="text-[8.5px] text-zinc-500">
                                  Avg Score: {d.metricsSummary?.averageStability || 80}/100 • Runs: {d.metricsSummary?.totalRunsThisPeriod || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="bg-[#121214] border border-[#222226] p-12 text-center text-zinc-500 italic uppercase">
                    Select a compiled executive report from the list to view deck presentations, boardroom PDF layouts, export history, and sharing tokens.
                  </div>
                )}

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};
