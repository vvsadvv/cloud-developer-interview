import type {
  IssueProblem,
  JiraPrioritySummary,
  PrioritySuggestion,
  PrioritySuggestionLabel
} from "./types";

const HIGH_PRIORITY_PATTERNS = [
  "highest",
  "high",
  "critical",
  "blocker",
  "urgent",
  "major",
  "выс",
  "крит",
  "сроч"
];

const MEDIUM_PRIORITY_PATTERNS = [
  "medium",
  "normal",
  "default",
  "обыч",
  "средн",
  "норм"
];

const LOW_PRIORITY_PATTERNS = [
  "low",
  "lowest",
  "minor",
  "trivial",
  "низ",
  "минор",
  "трив"
];

const DEADLINE_RISK_DAYS = 3;
const RECENT_ACTIVITY_WINDOW_DAYS = 14;

function normalizePriorityName(name: string): string {
  return name.trim().toLowerCase();
}

function matchesAnyPattern(name: string, patterns: string[]): boolean {
  const normalized = normalizePriorityName(name);
  return patterns.some((pattern) => normalized.includes(pattern));
}

function getPriorityIndex(priorities: JiraPrioritySummary[], priorityId: string | undefined): number {
  if (!priorityId) {
    return -1;
  }

  return priorities.findIndex((priority) => priority.id === priorityId);
}

function getHigherPriorities(
  priorities: JiraPrioritySummary[],
  currentPriorityId: string | undefined
): JiraPrioritySummary[] {
  const currentIndex = getPriorityIndex(priorities, currentPriorityId);

  if (currentIndex <= 0) {
    return currentIndex === -1 ? [...priorities] : [];
  }

  return priorities.slice(0, currentIndex);
}

function findPriorityByPatterns(
  priorities: JiraPrioritySummary[],
  patterns: string[]
): JiraPrioritySummary | null {
  return priorities.find((priority) => matchesAnyPattern(priority.name, patterns)) ?? null;
}

function getFallbackMediumPriority(
  priorities: JiraPrioritySummary[],
  currentPriorityId: string | undefined
): JiraPrioritySummary | null {
  const higherPriorities = getHigherPriorities(priorities, currentPriorityId);

  if (higherPriorities.length === 0) {
    return null;
  }

  return higherPriorities[higherPriorities.length - 1] ?? null;
}

function getFallbackHighPriority(
  priorities: JiraPrioritySummary[],
  currentPriorityId: string | undefined
): JiraPrioritySummary | null {
  const higherPriorities = getHigherPriorities(priorities, currentPriorityId);

  if (higherPriorities.length === 0) {
    return null;
  }

  return higherPriorities[0] ?? null;
}

function buildPrioritySuggestion(
  priority: JiraPrioritySummary | null,
  label: PrioritySuggestionLabel
): PrioritySuggestion | null {
  if (!priority) {
    return null;
  }

  return {
    id: priority.id,
    name: priority.name,
    label
  };
}

export function isRecentlyUpdated(updatedAt: string): boolean {
  const updatedTime = Date.parse(updatedAt);

  if (Number.isNaN(updatedTime)) {
    return false;
  }

  const cutoff = Date.now() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return updatedTime >= cutoff;
}

export function isDoneStatus(category: string | undefined): boolean {
  return category === "done";
}

export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) {
    return null;
  }

  const dueTime = Date.parse(`${dueDate}T23:59:59.000Z`);

  if (Number.isNaN(dueTime)) {
    return null;
  }

  return Math.ceil((dueTime - Date.now()) / (24 * 60 * 60 * 1000));
}

export function isLowPriority(
  priorities: JiraPrioritySummary[],
  priority: JiraPrioritySummary | null
): boolean {
  if (!priority) {
    return false;
  }

  if (matchesAnyPattern(priority.name, LOW_PRIORITY_PATTERNS)) {
    return true;
  }

  if (
    matchesAnyPattern(priority.name, HIGH_PRIORITY_PATTERNS) ||
    matchesAnyPattern(priority.name, MEDIUM_PRIORITY_PATTERNS)
  ) {
    return false;
  }

  const index = getPriorityIndex(priorities, priority.id);

  if (index === -1) {
    return false;
  }

  return index >= Math.ceil(priorities.length / 2);
}

export function getSuggestedPriority(
  priorities: JiraPrioritySummary[],
  priority: JiraPrioritySummary | null,
  dueDate: string | null,
  statusCategory: string | undefined
): PrioritySuggestion | null {
  if (!dueDate || isDoneStatus(statusCategory) || !priority || priorities.length <= 1) {
    return null;
  }

  const daysUntilDue = getDaysUntilDue(dueDate);

  if (daysUntilDue === null || daysUntilDue > DEADLINE_RISK_DAYS) {
    return null;
  }

  const higherPriorities = getHigherPriorities(priorities, priority.id);

  if (higherPriorities.length === 0) {
    return null;
  }

  if (daysUntilDue <= 1) {
    const exactHighMatch =
      findPriorityByPatterns(higherPriorities, HIGH_PRIORITY_PATTERNS) ??
      getFallbackHighPriority(priorities, priority.id);

    return buildPrioritySuggestion(exactHighMatch, "High");
  }

  const exactMediumMatch =
    findPriorityByPatterns(higherPriorities, MEDIUM_PRIORITY_PATTERNS) ??
    getFallbackMediumPriority(priorities, priority.id);

  return buildPrioritySuggestion(exactMediumMatch, "Medium");
}

export function getIssueProblems(input: {
  assigneeAccountId?: string | null;
  dueDate: string | null;
  priority: JiraPrioritySummary | null;
  priorities: JiraPrioritySummary[];
  statusCategory: string | undefined;
}): IssueProblem[] {
  const problems: IssueProblem[] = [];
  const isDone = isDoneStatus(input.statusCategory);

  if (!input.assigneeAccountId && !isDone) {
    problems.push("UNASSIGNED");
  }

  if (
    !isDone &&
    isLowPriority(input.priorities, input.priority) &&
    getSuggestedPriority(input.priorities, input.priority, input.dueDate, input.statusCategory) !== null
  ) {
    problems.push("LOW_PRIORITY_CLOSE_DEADLINE");
  }

  return problems;
}
