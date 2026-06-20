export type Intent =
  | { type: 'summarize_document'; documentUrl: string }
  | { type: 'summarize_group'; range: 'today' | 'this_week' }
  | { type: 'draft_weekly_report' }
  | { type: 'confirm_latest' }
  | { type: 'unknown' };

export type BotEvent = {
  messageId: string;
  conversationId: string;
  senderId: string;
  text: string;
  raw: unknown;
};

export type WeeklyContext = {
  groupSummary: string;
  documents: string[];
  todos: string[];
  meetings: string[];
};

export type ToolRegistry = {
  readDocument(documentUrl: string): Promise<string>;
  searchGroupMessages(conversationId: string, range: 'today' | 'this_week'): Promise<string[]>;
  searchAllGroupMessages(range: 'today' | 'this_week'): Promise<string[]>;
  collectWeeklyContext(userId: string, conversationId: string): Promise<WeeklyContext>;
  submitWeeklyReport(userId: string, content: string): Promise<{ ok: boolean; id?: string }>;
};

export type LlmAgent = {
  chat(input: string): Promise<string>;
  summarizeDocument(content: string): Promise<string>;
  summarizeGroup(messages: string[]): Promise<string>;
  draftWeeklyReport(context: WeeklyContext): Promise<string>;
};

export type ReplyService = {
  sendText(event: BotEvent, text: string): Promise<void>;
};

export type RefundReportSettings = {
  enabled: boolean;
  userIds: string[];
  thresholdPercent: number;
  timezone: string;
  llmOnAnomaly: 'never' | 'fail_only' | 'fail_or_threshold';
};

export type BotConfig = {
  allowedConversationIds: string[];
  allowedUserIds?: string[];
  defaultGroupConversationId?: string;
  groupSummaryLimits?: {
    today: number;
    this_week: number;
  };
  refundReport?: RefundReportSettings;
};

export type HandleResult =
  | { status: 'handled' }
  | { status: 'denied' }
  | { status: 'duplicate' }
  | { status: 'ignored' };
