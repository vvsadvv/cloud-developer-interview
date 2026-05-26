import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography
} from "@mui/material";
import type {
  JiraIssueSummary,
  JiraUserReference,
  PrioritySuggestion,
  TeamMemberSummary
} from "@shared/types";

interface IssueFixDialogProps {
  open: boolean;
  issue: JiraIssueSummary | null;
  team: TeamMemberSummary[];
  assignableMembers: JiraUserReference[];
  assignLoading: boolean;
  priorityLoading: boolean;
  onClose: () => void;
  onAssign: (accountId: string) => Promise<void>;
  onRaisePriority: (priority: PrioritySuggestion) => Promise<void>;
}

export function IssueFixDialog({
  open,
  issue,
  team,
  assignableMembers,
  assignLoading,
  priorityLoading,
  onClose,
  onAssign,
  onRaisePriority
}: IssueFixDialogProps) {
  const activeMembers = assignableMembers.filter((member) => member.active);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<PrioritySuggestion | null>(null);

  useEffect(() => {
    setSelectedAccountId(activeMembers[0]?.accountId ?? "");
  }, [issue?.id, assignableMembers]);

  useEffect(() => {
    setSelectedPriority(issue?.suggestedPriority ?? null);
  }, [issue?.id, issue?.suggestedPriority]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{issue ? `Fix ${issue.key}` : "Fix issue"}</DialogTitle>
      <DialogContent dividers>
        {!issue ? (
          <Typography color="text.secondary">Select an issue with an actionable problem.</Typography>
        ) : (
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="h6">{issue.summary}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Resolve the highlighted problem(s) directly from the project dashboard.
              </Typography>
            </Box>

            {issue.problems.length === 0 ? (
              <Alert severity="success">This issue is already healthy.</Alert>
            ) : null}

            {issue.problems.includes("UNASSIGNED") ? (
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Assign a teammate</Typography>
                <FormControl fullWidth>
                  <InputLabel id="assignee-select-label">Project member</InputLabel>
                  <Select
                    id="assignee-select"
                    labelId="assignee-select-label"
                    label="Project member"
                    value={selectedAccountId}
                    inputProps={{
                      id: "assignee-select-input",
                      name: "assigneeAccountId"
                    }}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    {activeMembers.map((member) => (
                      <MenuItem key={member.accountId} value={member.accountId}>
                        {member.displayName}
                        {(() => {
                          const teamMember = team.find((candidate) => candidate.accountId === member.accountId);
                          return teamMember ? ` • ${teamMember.assignedIssueCount} issue(s)` : "";
                        })()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="error"
                  disabled={!selectedAccountId || assignLoading}
                  onClick={() => void onAssign(selectedAccountId)}
                >
                  {assignLoading ? "Assigning..." : "Assign teammate"}
                </Button>
              </Stack>
            ) : null}

            {issue.problems.includes("UNASSIGNED") && issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE") ? (
              <Divider />
            ) : null}

            {issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE") ? (
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Raise priority</Typography>
                <Typography variant="body2" color="text.secondary">
                  This issue is too close to its deadline for the current priority level.
                </Typography>
                <FormControl>
                  <FormLabel id="priority-suggestion-label">Recommended priority</FormLabel>
                  <RadioGroup
                    aria-labelledby="priority-suggestion-label"
                    name="prioritySuggestion"
                    value={selectedPriority?.id ?? ""}
                    onChange={(event) => {
                      if (issue?.suggestedPriority?.id === event.target.value) {
                        setSelectedPriority(issue.suggestedPriority);
                      }
                    }}
                  >
                    {issue.suggestedPriority ? (
                      <FormControlLabel
                        value={issue.suggestedPriority.id}
                        control={<Radio />}
                        label={`${issue.suggestedPriority.label} (${issue.suggestedPriority.name})`}
                      />
                    ) : null}
                  </RadioGroup>
                </FormControl>
                <Button
                  variant="contained"
                  color="warning"
                  disabled={priorityLoading || !selectedPriority}
                  onClick={() => selectedPriority ? void onRaisePriority(selectedPriority) : undefined}
                >
                  {priorityLoading
                    ? "Updating..."
                    : `Raise to ${selectedPriority?.name ?? "recommended priority"}`}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
