export type CommandHandler = (payload?: unknown) => void;
/** Intents are resolved centrally; panels do not import each other. */
export class CommandRegistry {
  private handlers = new Map<string, CommandHandler>();
  register(id: string, handler: CommandHandler) {
    if (this.handlers.has(id)) throw new Error(`Duplicate command: ${id}`);
    this.handlers.set(id, handler);
    return () => this.handlers.delete(id);
  }
  execute(id: string, payload?: unknown) {
    const handler = this.handlers.get(id);
    if (!handler) return false;
    handler(payload);
    return true;
  }
}
