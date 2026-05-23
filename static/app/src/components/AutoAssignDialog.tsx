import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

interface AutoAssignDialogProps {
  open: boolean;
  issueCount: number;
  memberCount: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function AutoAssignDialog({
  open,
  issueCount,
  memberCount,
  loading,
  onClose,
  onConfirm
}: AutoAssignDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Confirm auto-assignment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography>
            This will randomly assign {issueCount} unassigned issue(s) across {memberCount} active teammate(s).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The UI updates optimistically, then the app syncs with Jira again to confirm the final state.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={loading || issueCount === 0 || memberCount === 0}
        >
          {loading ? "Assigning..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
