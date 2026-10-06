import path from "node:path";
import fs from "node:fs/promises";
import { Store } from "./store.js";
import { Credentials, type Encryption } from "./credentials.js";
import { PiAILLMService } from "./pi-ai.js";
import { Application } from "./application.js";
import { FakeLLMService } from "./fake-llm.js";
export { dispatch } from "./ipc.js";
export async function createBackend(options: {
  userData: string;
  encryption: Encryption;
  openFolder: () => Promise<string | undefined>;
  openExternal: (url: string) => Promise<void>;
  home?: string;
  trashItem?: (file: string) => Promise<void>;
  fake?: boolean;
}) {
  await fs.mkdir(options.userData, { recursive: true });
  const store = new Store(path.join(options.userData, "computador.sqlite"));
  const credentials = new Credentials(store, options.encryption);
  const llm = options.fake
    ? new FakeLLMService(store)
    : new PiAILLMService(credentials, store);
  const application = new Application(store, llm, {
    ...options,
    agentsDirectory: path.join(options.home ?? options.userData, ".computador", "agents"),
    trashItem: options.trashItem,
    secureStorage: () => credentials.persistent,
  });
  await application.init();
  return application;
}
