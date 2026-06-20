export type ApprovalStatus = 'pending' | 'confirmed' | 'expired';

export type ApprovalActionType = 'submit_weekly_report' | 'send_message' | 'create_todo';

export type Approval = {
  id: string;
  actionType: ApprovalActionType;
  conversationId: string;
  userId: string;
  summary: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: Date;
  expiresAt: Date;
};

export type CreateApprovalInput = Pick<
  Approval,
  'actionType' | 'conversationId' | 'userId' | 'summary' | 'payload'
>;

export class InMemoryApprovalStore {
  readonly #items = new Map<string, Approval>();
  readonly #now: () => Date;
  #sequence = 0;

  constructor(now: () => Date = () => new Date()) {
    this.#now = now;
  }

  create(input: CreateApprovalInput): Approval {
    const now = this.#now();
    const approval: Approval = {
      ...input,
      id: `approval-${++this.#sequence}`,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000)
    };
    this.#items.set(approval.id, approval);
    return approval;
  }

  latestPending(userId: string, conversationId: string): Approval | undefined {
    const now = this.#now();
    return [...this.#items.values()]
      .filter((item) => item.userId === userId && item.conversationId === conversationId)
      .filter((item) => item.status === 'pending' && item.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .at(0);
  }

  confirm(id: string): Approval | undefined {
    const approval = this.#items.get(id);
    if (!approval || approval.status !== 'pending' || approval.expiresAt <= this.#now()) {
      return undefined;
    }

    approval.status = 'confirmed';
    return approval;
  }
}
