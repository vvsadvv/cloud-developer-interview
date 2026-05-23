import { isRecentlyUpdated } from "../../shared/issueRules";
import type { JiraIssueSummary, ProjectStats } from "../../shared/types";

export { isRecentlyUpdated };

export function getRecentActivityScore(assignedIssueCount: number, recentUpdatedIssueCount: number, active: boolean): number {
  const rawScore = (active ? 35 : 10) + assignedIssueCount * 9 + recentUpdatedIssueCount * 14;
  return Math.max(0, Math.min(100, rawScore));
}

export function getRecentActivityLabel(score: number): string {
  if (score >= 80) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

export function getProjectStats(issues: JiraIssueSummary[], activeMembers: number): ProjectStats {
  const assignedIssues = issues.filter((issue) => Boolean(issue.assignee)).length;
  const unassignedIssues = issues.filter((issue) => issue.problems.includes("UNASSIGNED")).length;
  const deadlineRiskIssues = issues.filter((issue) =>
    issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE")
  ).length;

  return {
    totalIssues: issues.length,
    assignedIssues,
    unassignedIssues,
    deadlineRiskIssues,
    problemIssues: issues.filter((issue) => issue.problems.length > 0).length,
    activeMembers
  };
}
