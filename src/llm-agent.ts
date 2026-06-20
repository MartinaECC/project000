import { logger } from './logger.ts';
import type { LlmAgent, WeeklyContext } from './types.ts';

export class OpenAiCompatibleLlmAgent implements LlmAgent {
  readonly #apiKey?: string;
  readonly #baseUrl: string;
  readonly #model?: string;

  constructor(options: { apiKey?: string; baseUrl: string; model?: string }) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/$/u, '');
    this.#model = options.model;
  }

  async chat(input: string): Promise<string> {
    return this.#complete(
      '你是一个接入钉钉机器人的中文智能助手。请自然、简洁地回答用户，不要声称自己执行了未实际执行的钉钉操作。',
      input
    );
  }

  async summarizeDocument(content: string): Promise<string> {
    return this.#complete('请总结下面的钉钉文档，输出摘要、关键结论和待办项。', content);
  }

  async summarizeGroup(messages: string[]): Promise<string> {
    return this.#complete(
      '请总结下面的钉钉群聊消息，输出：1. 讨论主题；2. 关键结论；3. 风险或阻塞；4. 行动项。只基于消息内容，不要编造。',
      messages.join('\n')
    );
  }

  async draftWeeklyReport(context: WeeklyContext): Promise<string> {
    return this.#complete('请基于上下文生成一份中文周报草稿，保持事实克制。', JSON.stringify(context, null, 2));
  }

  async #complete(system: string, user: string): Promise<string> {
    if (!this.#apiKey || !this.#model) {
      logger.warn('llm.fallback.used', {
        reason: 'missing_api_key_or_model',
        hasApiKey: Boolean(this.#apiKey),
        hasModel: Boolean(this.#model)
      });
      return fallbackSummary(user);
    }

    const startedAt = Date.now();
    logger.info('llm.request.started', {
      baseUrl: this.#baseUrl,
      model: this.#model,
      promptLength: user.length
    });

    const response = await fetch(`${this.#baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.#model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      logger.error('llm.request.failed', {
        baseUrl: this.#baseUrl,
        model: this.#model,
        status: response.status
      });
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || fallbackSummary(user);
    logger.info('llm.request.completed', {
      baseUrl: this.#baseUrl,
      model: this.#model,
      durationMs: Date.now() - startedAt,
      answerLength: content.length
    });
    return content;
  }
}

function fallbackSummary(content: string): string {
  return `未配置大模型，已返回原始内容预览：\n${content.slice(0, 1200)}`;
}
