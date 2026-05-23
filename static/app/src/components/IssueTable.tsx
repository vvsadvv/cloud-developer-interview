import dayjs from "dayjs";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { JiraIssueSummary } from "@shared/types";
import { getDaysUntilDue } from "@shared/issueRules";

interface IssueTableProps {
  issues: JiraIssueSummary[];
  actionLoading: Record<string, boolean>;
  onFix: (issueId: string) => void;
}

function getRowTint(issue: JiraIssueSummary): string | undefined {
  if (issue.problems.includes("UNASSIGNED")) {
    return "rgba(194, 65, 12, 0.06)";
  }

  if (issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE")) {
    return "rgba(245, 158, 11, 0.10)";
  }

  return undefined;
}

function renderProblemChips(issue: JiraIssueSummary) {
  if (issue.problems.length === 0) {
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label="Healthy"
      />
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
      {issue.problems.includes("UNASSIGNED") ? (
        <Chip
          size="small"
          color="error"
          icon={<PersonOffRoundedIcon />}
          label="No assignee"
        />
      ) : null}
      {issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE") ? (
        <Chip
          size="small"
          color="warning"
          icon={<WarningAmberRoundedIcon />}
          label="Low priority / close deadline"
        />
      ) : null}
    </Stack>
  );
}

export function IssueTable({ issues, actionLoading, onFix }: IssueTableProps) {
  const sortedIssues = [...issues].sort((left, right) => {
    if (right.problems.length !== left.problems.length) {
      return right.problems.length - left.problems.length;
    }

    return dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf();
  });

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <TableContainer>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Summary</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedIssues.map((issue) => {
              const loading =
                actionLoading[`assign:${issue.id}`] || actionLoading[`priority:${issue.id}`];
              const daysUntilDue = getDaysUntilDue(issue.dueDate);
              const dueLabel = !issue.dueDate
                ? "No due date"
                : daysUntilDue !== null && daysUntilDue < 0
                  ? `Overdue by ${Math.abs(daysUntilDue)}d`
                  : `Due ${dayjs(issue.dueDate).format("DD MMM")} (${daysUntilDue ?? "?"}d)`;

              return (
                <TableRow key={issue.id} sx={{ bgcolor: getRowTint(issue) }}>
                  <TableCell>
                    <Chip size="small" label={issue.key} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ minWidth: 280 }}>
                    <Typography fontWeight={600}>{issue.summary}</Typography>
                    {renderProblemChips(issue)}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={issue.status.name} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    {issue.assignee ? (
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar src={issue.assignee.avatarUrl} sx={{ width: 32, height: 32 }}>
                          {issue.assignee.displayName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{issue.assignee.displayName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {issue.assignee.active ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography color="error.main" fontWeight={600}>
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Stack spacing={0.75}>
                      <Chip
                        size="small"
                        color={issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE") ? "warning" : "default"}
                        label={issue.priority?.name ?? "Unset"}
                        sx={{ width: "fit-content" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {dueLabel}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant={issue.problems.length > 0 ? "contained" : "outlined"}
                      color={issue.problems.includes("UNASSIGNED") ? "error" : "primary"}
                      size="small"
                      disabled={issue.problems.length === 0 || loading}
                      onClick={() => onFix(issue.id)}
                    >
                      {loading ? "Saving..." : issue.problems.length > 0 ? "Fix" : "Healthy"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
