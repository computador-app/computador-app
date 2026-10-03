import { describe, expect, it } from "vitest";
import { parsePreferences, defaultPreferences } from "./preferences";
import { CommandRegistry } from "./commands";
describe("visual preferences", () => {
  it("restores valid preferences and discards domain data", () => {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          locale: "en",
          theme: "light",
          fontSize: 16,
          sessions: ["private message"],
        }),
      ),
    ).toEqual({ version: 1, locale: "en", theme: "light", fontSize: 16 });
  });
  it("recovers safely from malformed, unsupported and absent values", () => {
    for (const value of [null, "broken", "null", "[]", '{"version":2}'])
      expect(parsePreferences(value)).toEqual(defaultPreferences);
    expect(
      parsePreferences(
        '{"version":1,"locale":"xx","theme":"red","fontSize":999}',
      ),
    ).toEqual(defaultPreferences);
  });
});
describe("command registry", () => {
  it("dispatches payloads and removes disposed handlers", () => {
    const commands = new CommandRegistry();
    let result: unknown;
    const dispose = commands.register("file.open", (v) => (result = v));
    expect(commands.execute("file.open", { path: "README.md" })).toBe(true);
    expect(result).toEqual({ path: "README.md" });
    dispose();
    expect(commands.execute("file.open")).toBe(false);
  });
  it("rejects conflicting registrations", () => {
    const commands = new CommandRegistry();
    commands.register("open", () => {});
    expect(() => commands.register("open", () => {})).toThrow(
      "Duplicate command",
    );
  });
});
