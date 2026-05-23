import { invoke } from "@forge/bridge";
import type {
  AssignIssuePayload,
  AutoAssignPayload,
  AutoAssignResult,
  DashboardData,
  DashboardPayload,
  IssueMutationResult,
  RaisePriorityPayload
} from "@shared/types";

export const forgeApi = {
  getDashboard: (payload?: DashboardPayload) =>
    invoke<DashboardData>("getDashboard", payload ?? {}),
  assignIssue: (payload: AssignIssuePayload) =>
    invoke<IssueMutationResult>("assignIssue", payload),
  raisePriority: (payload: RaisePriorityPayload) =>
    invoke<IssueMutationResult>("raisePriority", payload),
  autoAssignUnassigned: (payload: AutoAssignPayload) =>
    invoke<AutoAssignResult>("autoAssignUnassigned", payload)
};
