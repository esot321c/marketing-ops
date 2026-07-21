import { test, expect, vi, afterEach } from "vitest";
import { getBoardPrefs, setBoardPrefs, deleteItem, duplicateItem } from "./api.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("getBoardPrefs fetches the tenant's board-prefs endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ columnOrder: ["idea", "drafting"], columnColors: { idea: "blue" } })
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await getBoardPrefs("example-agency");

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/content/example-agency/board-prefs",
    expect.objectContaining({ headers: expect.objectContaining({ "content-type": "application/json" }) })
  );
  expect(result).toEqual({ columnOrder: ["idea", "drafting"], columnColors: { idea: "blue" } });
});

test("setBoardPrefs posts columnOrder and columnColors to the board-prefs endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ columnOrder: ["idea"], columnColors: {} })
  );
  vi.stubGlobal("fetch", fetchMock);

  await setBoardPrefs("example-agency", { columnOrder: ["idea"], columnColors: {} });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/content/example-agency/board-prefs",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ columnOrder: ["idea"], columnColors: {} }),
    })
  );
});

test("deleteItem sends a DELETE request to the item's endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await deleteItem("example-agency", "item-1");

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/content/example-agency/item-1",
    expect.objectContaining({ method: "DELETE" })
  );
  expect(result).toEqual({ ok: true });
});

test("duplicateItem sends a POST request to the item's duplicate endpoint", async () => {
  const newItem = { id: "item-1-copy", state: "idea", title: "Item (copy)" };
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(newItem));
  vi.stubGlobal("fetch", fetchMock);

  const result = await duplicateItem("example-agency", "item-1");

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/content/example-agency/item-1/duplicate",
    expect.objectContaining({ method: "POST" })
  );
  expect(result).toEqual(newItem);
});
