import { describe, expect, it } from "vitest";
import { restorePanelState } from "./PanelFrame";
import type { PanelDefinition } from "../panels-sdk/types";
const definition: PanelDefinition = {
  id: "test",
  title: "Test",
  component: () => null,
  location: "right",
  defaultState: { count: 0 },
};
describe("panel state restoration", () => {
  it("clones defaults and rejects invalid or future state versions", () => {
    expect(restorePanelState(definition, {})).toEqual({ count: 0 });
    expect(restorePanelState(definition, {})).not.toBe(definition.defaultState);
    for (const stateVersion of [0, -1, 1.5, 2])
      expect(() => restorePanelState(definition, { stateVersion })).toThrow();
  });
  it("migrates saved state without mutating the persisted input", () => {
    const params = { uiState: { count: 2 }, stateVersion: 1 };
    const upgraded = {
      ...definition,
      stateVersion: 2,
      migrateState: (state: { [key: string]: unknown }, from: number) => ({
        count: Number(state.count) + from,
      }),
    };
    expect(restorePanelState(upgraded, params)).toEqual({ count: 3 });
    expect(params.uiState).toEqual({ count: 2 });
    expect(() =>
      restorePanelState({ ...definition, stateVersion: 2 }, params),
    ).toThrow("Missing panel state migration");
  });
});
