export interface NavigationRestructureProposal {
  workflowPath: string;
  proposedLayoutChange: string;
  pathOptimizationScore: number;
}

export function generateNavigationOptimization(
  workflowPath: string,
  loopCount = 2
): NavigationRestructureProposal {
  const proposedLayoutChange = loopCount > 2
    ? `Flatten structural hierarchy on ${workflowPath}. Merge configuration parameters into a single view-tabs model rather than deep separate nested link paths.`
    : `Implement active visual breadcrumbs on ${workflowPath} and align side navigation labels with industry patterns.`;

  return {
    workflowPath,
    proposedLayoutChange,
    pathOptimizationScore: Math.min(50, 15 + loopCount * 10)
  };
}
