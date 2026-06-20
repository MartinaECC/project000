export class InMemoryIdempotencyStore {
  readonly #seen = new Set<string>();

  claim(messageId: string): boolean {
    if (this.#seen.has(messageId)) {
      return false;
    }
    this.#seen.add(messageId);
    return true;
  }
}
