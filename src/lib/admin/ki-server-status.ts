export interface KiServerStatusPayload {
  online: boolean;
  status: string;
  aiEngine: string;
  activeTasks: number;
  uptimeSeconds: number;
  checkedAt: string;
  sourceUrl: string;
  error: string | null;
}
