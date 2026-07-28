import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBranchCatalogs } from "./branches";

describe("fetchBranchCatalogs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves the available catalog when the other one fails after retrying", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) => {
        const url = String(input);
        if (url.includes("accion=sucursales")) {
          return new Response(
            JSON.stringify([
              { idSucursal: "S-1", nombre: "Centro", estado: "Activa" },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "Fallo temporal" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    const result = await fetchBranchCatalogs();

    expect(result.branches).toHaveLength(1);
    expect(result.areas).toEqual([]);
    expect(result.failed).toEqual(["areas"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
