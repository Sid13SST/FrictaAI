import { prisma } from '../packages/db/src/index';
import { RBACAuthorizationGuard } from '../packages/rbac-core/src/index';

async function diagnose() {
  console.log('🔍 Running RBAC Diagnostics...');
  
  const user = await prisma.user.findFirst();
  console.log('First User:', user);
  
  const project = await prisma.project.findFirst();
  console.log('First Project:', project);
  
  if (project) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: project.workspaceId || '' }
    });
    console.log('Project Workspace:', workspace);
    
    if (user && workspace) {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: workspace.id,
          userId: user.id
        }
      });
      console.log('Workspace Member:', member);
      
      const guard = new RBACAuthorizationGuard(prisma);
      const isProjectInScope = await guard.checkProjectScope(workspace.id, project.id);
      console.log('Is Project in Scope:', isProjectInScope);
      
      const hasReadPermission = await guard.checkWorkspacePermission(user.id, workspace.id, 'ANALYTICS', 'READ');
      console.log('Has ANALYTICS READ Permission:', hasReadPermission);
    }
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
