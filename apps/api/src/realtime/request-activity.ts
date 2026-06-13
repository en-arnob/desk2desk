export const REQUEST_ACTIVITY = 'request.activity';

export type RequestAction =
  | 'created'
  | 'claimed'
  | 'commented'
  | 'attached'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'reassigned'
  | 'cancelled';

/** Plain, serializable payload emitted on every request mutation. */
export interface RequestActivityPayload {
  action: RequestAction;
  requestId: number;
  title: string;
  categoryId: number;
  categoryName: string;
  requesterId: string;
  assigneeId: string | null;
  actorId: string;
  actorName: string;
  /** Comment snippet or attachment file name, where relevant. */
  extra?: string;
}
