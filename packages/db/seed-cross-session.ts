import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Cross-Session Intelligence and Longitudinal models...');

  // 1. Fetch default user, workspace, and project
  const user = await prisma.user.findFirst();
  const workspace = await prisma.workspace.findFirst();
  const project = await prisma.project.findFirst({
    include: { sessions: true }
  });

  if (!user || !workspace || !project) {
    console.error('❌ User, Workspace, or Project not found. Please run seed-workspace-core & seed-rbac-core first.');
    process.exit(1);
  }

  console.log(`Resolved Workspace: "${workspace.name}" (ID: ${workspace.id})`);
  console.log(`Resolved Project: "${project.projectName}" (ID: ${project.id})`);

  const session = project.sessions[0];
  const session2 = project.sessions[1] || session;

  // 2. Seed CrossSessionPattern
  await prisma.crossSessionPattern.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        patternName: 'Looping hesitation on checkout CTA',
        category: 'FRICTION',
        description: 'Users repeatedly hover checkout buttons and click help links, indicating unclear labeling.',
        evidenceCount: 3,
        supportingData: {
          sessionIds: [session?.id || 's1', session2?.id || 's2'],
          targetElements: ['button[id="checkout"]', 'a[href="/help"]'],
          severities: ['WARNING', 'CRITICAL']
        },
        severity: 'CRITICAL',
        resolved: false
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        patternName: 'Input mismatch on email form field',
        category: 'NAVIGATION',
        description: 'High rate of validation errors on email fields leading to scanning loops.',
        evidenceCount: 2,
        supportingData: {
          sessionIds: [session?.id || 's1'],
          targetElements: ['input[name="email"]'],
          severities: ['WARNING']
        },
        severity: 'WARNING',
        resolved: true
      }
    ]
  });
  console.log('Seeded 2 cross-session patterns.');

  // 3. Seed HistoricalRegression
  await prisma.historicalRegression.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        metricName: 'Task Completion Rate',
        baseVersion: 'v1.0',
        compareVersion: 'v1.1',
        baseValue: 98.5,
        compareValue: 84.2,
        changePercent: -14.5,
        status: 'DEGRADED',
        triggerSignals: {
          signals: ['Unexpected exit rate spike at step #4'],
          elements: ['form#payment']
        }
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        metricName: 'Friction Index',
        baseVersion: 'v1.0',
        compareVersion: 'v1.1',
        baseValue: 12.4,
        compareValue: 24.8,
        changePercent: 100.0,
        status: 'DEGRADED',
        triggerSignals: {
          signals: ['Hesitation signal duration exceeded thresholds'],
          elements: ['button#submit']
        }
      }
    ]
  });
  console.log('Seeded 2 historical regressions.');

  // 4. Seed OrganizationalTrend
  const date4 = new Date();
  const date3 = new Date(); date3.setDate(date3.getDate() - 7);
  const date2 = new Date(); date2.setDate(date2.getDate() - 14);
  const date1 = new Date(); date1.setDate(date1.getDate() - 21);

  await prisma.organizationalTrend.createMany({
    data: [
      {
        workspaceId: workspace.id,
        trendType: 'stability',
        interval: 'WEEKLY',
        timestamp: date1,
        scoreValue: 92.5,
        metadata: { activeSessions: 8 }
      },
      {
        workspaceId: workspace.id,
        trendType: 'stability',
        interval: 'WEEKLY',
        timestamp: date2,
        scoreValue: 88.0,
        metadata: { activeSessions: 12 }
      },
      {
        workspaceId: workspace.id,
        trendType: 'stability',
        interval: 'WEEKLY',
        timestamp: date3,
        scoreValue: 81.2,
        metadata: { activeSessions: 15 }
      },
      {
        workspaceId: workspace.id,
        trendType: 'stability',
        interval: 'WEEKLY',
        timestamp: date4,
        scoreValue: 74.5,
        metadata: { activeSessions: 19 }
      }
    ]
  });
  console.log('Seeded 4 weekly organizational stability trends.');

  // 5. Seed PersonaEvolution
  await prisma.personaEvolution.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        personaName: 'Beginner Teacher',
        adaptationRate: 64.2,
        frictionIndex: 28.5,
        successRate: 72.0,
        fatigueTrend: {
          steps: [1, 2, 3, 4, 5],
          loads: [22, 38, 55, 78, 92]
        }
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        personaName: 'Power User',
        adaptationRate: 94.8,
        frictionIndex: 8.2,
        successRate: 99.1,
        fatigueTrend: {
          steps: [1, 2, 3, 4, 5],
          loads: [10, 15, 20, 24, 28]
        }
      }
    ]
  });
  console.log('Seeded 2 persona evolution records.');

  // 6. Seed WorkflowStabilityHistory
  await prisma.workflowStabilityHistory.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        runId: 'v1.0-prod',
        stabilityScore: 92.5,
        completionRate: 98.2,
        stepAverage: 4.2,
        complexityRank: 'LOW'
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        runId: 'v1.1-prod',
        stabilityScore: 74.5,
        completionRate: 84.2,
        stepAverage: 7.8,
        complexityRank: 'HIGH'
      }
    ]
  });
  console.log('Seeded 2 stability history records.');

  // 7. Seed LongitudinalSignal
  await prisma.longitudinalSignal.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        elementSelector: 'button#checkout',
        signalType: 'HESITATION',
        frequency: 4,
        averageSeverity: 82.5,
        historicalBasis: {
          sessionIds: [session?.id || 's1', session2?.id || 's2'],
          timestamps: [date3.toISOString(), date4.toISOString()]
        }
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        elementSelector: 'form#payment',
        signalType: 'MISMATCH',
        frequency: 3,
        averageSeverity: 65.0,
        historicalBasis: {
          sessionIds: [session2?.id || 's2'],
          timestamps: [date4.toISOString()]
        }
      }
    ]
  });
  console.log('Seeded 2 longitudinal signals.');

  // 8. Seed SessionCorrelation
  if (session && session2) {
    await prisma.sessionCorrelation.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        sessionAId: session.id,
        sessionBId: session2.id,
        similarity: 0.72,
        sharedFriction: ['Looping hesitation on checkout CTA', 'Input validation error'],
        deltaNotes: 'Strong correlation identified on payment flow step delay.'
      }
    });
    console.log('Seeded 1 session correlation.');
  }

  // 9. Seed UXMemorySnapshot
  await prisma.uXMemorySnapshot.createMany({
    data: [
      {
        workspaceId: workspace.id,
        projectId: project.id,
        snapshotName: 'Pre-Release Usability Audit',
        summary: 'Baseline check before deployment. Highlighted checkout friction.',
        patternCount: 2,
        activeRiskCount: 1,
        trendHealth: 88.0
      },
      {
        workspaceId: workspace.id,
        projectId: project.id,
        snapshotName: 'Post-Release Hotfix Verification',
        summary: 'Verification run showing elevated complexity on payment validations.',
        patternCount: 3,
        activeRiskCount: 2,
        trendHealth: 74.5
      }
    ]
  });
  console.log('Seeded 2 UX memory snapshots.');

  console.log('✅ Cross-Session database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
