export type ProjectOption = {
  id: string;
  name: string;
  workspaceName: string;
  billable: boolean;
  tasks: { id: string; name: string }[];
};

export type EntryVM = {
  id: string;
  projectId: string;
  projectName: string;
  workspaceName: string;
  taskId: string | null;
  taskName: string | null;
  date: string;
  minutes: number;
  timerStartedAt: string | null;
  notes: string | null;
  billable: boolean;
  invoiceNumber: string | null;
};
