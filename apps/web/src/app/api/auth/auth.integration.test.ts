import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../../../middleware";
import { findActiveCfgUser } from "@/lib/auth/cfg-users";
import {
  createSessionToken,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/token";

let sessionCookieForRequest: string | undefined;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === "gla_oauth_state") return { value: "state-ok" };
      if (name === "gla_oauth_nonce") return { value: "nonce-ok" };
      if (name === SESSION_COOKIE && sessionCookieForRequest) {
        return { value: sessionCookieForRequest };
      }
      return undefined;
    }),
    delete: vi.fn(),
  })),
}));

vi.mock("@/lib/auth/cfg-users", () => ({
  findActiveCfgUser: vi.fn(),
}));

const mockedFindActiveCfgUser = vi.mocked(findActiveCfgUser);
const cfgTecnico = {
  idUsuario: "1",
  nombre: "Tere Técnica",
  correo: "tere@gla.test",
  rol: "Técnico" as const,
  sucursal: "MZT",
  area: "Mantenimiento",
  estado: "Activo" as const,
};

function googleIdToken(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.signature`;
}

async function callbackResponse() {
  const { GET } = await import("./callback/google/route");
  return GET(
    new NextRequest(
      "http://localhost:3000/api/auth/callback/google?code=oauth-code&state=state-ok",
    ),
  );
}

async function validTecnicoCookie() {
  return createSessionToken(
    {
      user: {
        name: cfgTecnico.nombre,
        email: cfgTecnico.correo,
        role: cfgTecnico.rol,
        sucursal: cfgTecnico.sucursal,
        area: cfgTecnico.area,
      },
      exp: Date.now() + 60_000,
    },
    process.env.AUTH_SECRET!,
  );
}

describe("auth session integration", () => {
  beforeEach(() => {
    sessionCookieForRequest = undefined;
    process.env.AUTH_SECRET = "test-secret-with-enough-entropy";
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/auth/callback/google";
    mockedFindActiveCfgUser.mockResolvedValue(cfgTecnico);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          id_token: googleIdToken({
            email: "Tere@GLA.TEST",
            email_verified: true,
            name: "Tere Técnica",
            nonce: "nonce-ok",
          }),
        }),
      ),
    );
  });

  it("callback redirects to /activos with a local HttpOnly Lax session cookie", async () => {
    const response = await callbackResponse();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/activos",
    );
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Secure");
  });

  it("callback cookie can be verified and preserves the Técnico role", async () => {
    const response = await callbackResponse();
    const token = response.cookies.get(SESSION_COOKIE)?.value;
    expect(token).toBeTruthy();

    const session = await verifySessionToken(token, process.env.AUTH_SECRET!);

    expect(session?.user.email).toBe("tere@gla.test");
    expect(session?.user.role).toBe("Técnico");
  });

  it("/api/auth/session returns Técnico and allowed permissions with the callback cookie", async () => {
    const response = await callbackResponse();
    const token = response.cookies.get(SESSION_COOKIE)?.value;
    expect(token).toBeTruthy();
    sessionCookieForRequest = token;
    const { GET } = await import("./session/route");

    const sessionResponse = await GET();
    const body = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(body.user.role).toBe("Técnico");
    expect(body.permissions).toContain("activos:read");
  });

  it("protected routes redirect to /login before rendering when cookie is missing", async () => {
    const response = await middleware(
      new NextRequest("http://localhost:3000/activos"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Factivos",
    );
  });

  it("protected routes allow access when the cookie is valid", async () => {
    const token = await validTecnicoCookie();
    const response = await middleware(
      new NextRequest("http://localhost:3000/activos", {
        headers: { cookie: `${SESSION_COOKIE}=${token}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
