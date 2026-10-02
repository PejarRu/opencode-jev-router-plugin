import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
    authFileSource,
    type CredentialSource,
    envSource,
    integrationSource,
    readAuthFile,
    resolveApiKey,
} from "../src/auth.ts"

function source(name: string, read: () => Promise<string | undefined>): CredentialSource {
    return { name, read }
}

describe("resolveApiKey", () => {
    test("returns the first non-empty trimmed key and its source", async () => {
        const result = await resolveApiKey([
            source("empty", async () => undefined),
            source("blank", async () => "   "),
            source("second", async () => "  key-b "),
            source("third", async () => "key-c"),
        ])

        expect(result).toEqual({ key: "key-b", source: "second" })
    })

    test("skips failing sources and reports them", async () => {
        const failures: string[] = []
        const result = await resolveApiKey(
            [
                source("broken", async () => {
                    throw new Error("boom")
                }),
                source("ok", async () => "key"),
            ],
            (name, error) => failures.push(`${name}: ${(error as Error).message}`),
        )

        expect(result).toEqual({ key: "key", source: "ok" })
        expect(failures).toEqual(["broken: boom"])
    })

    test("returns undefined when no source has a key", async () => {
        expect(await resolveApiKey([source("none", async () => undefined)])).toBeUndefined()
    })
})

describe("envSource", () => {
    test("reads JEV_ROUTER_API_KEY by default", async () => {
        const env = { JEV_ROUTER_API_KEY: "sk-env" }

        expect(envSource(undefined, env).name).toBe("env:JEV_ROUTER_API_KEY")
        expect(await envSource(undefined, env).read()).toBe("sk-env")
        expect(await envSource("OTHER", env).read()).toBeUndefined()
    })
})

describe("integrationSource", () => {
    const connections = {
        active: async (id: string) => (id === "openrouter" ? { id: "conn_1" } : undefined),
        resolve: async (connection: { id: string }) =>
            connection.id === "conn_1" ? { type: "key", key: "sk-int" } : undefined,
    }

    test("resolves the key of the active connection", async () => {
        expect(await integrationSource(connections, "openrouter").read()).toBe("sk-int")
    })

    test("returns undefined without an active connection", async () => {
        expect(await integrationSource(connections, "anthropic").read()).toBeUndefined()
    })

    test("ignores oauth credentials", async () => {
        const oauth = {
            active: async () => ({ id: "conn_2" }),
            resolve: async () => ({ type: "oauth", access: "token" }),
        }

        expect(await integrationSource(oauth, "openrouter").read()).toBeUndefined()
    })
})

describe("readAuthFile", () => {
    let dir: string
    let file: string

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "jev-auth-"))
        file = join(dir, "auth.json")
    })

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true })
    })

    test("returns api and key entries", async () => {
        writeFileSync(
            file,
            JSON.stringify({
                openrouter: { type: "api", key: "sk-file" },
                openai: { type: "key", key: "sk-openai" },
                github: { type: "oauth", access: "token" },
            }),
        )

        expect(await readAuthFile("openrouter", file)).toBe("sk-file")
        expect(await readAuthFile("openai", file)).toBe("sk-openai")
        expect(await readAuthFile("github", file)).toBeUndefined()
        expect(await readAuthFile("missing", file)).toBeUndefined()
        expect(await authFileSource("openrouter", file).read()).toBe("sk-file")
    })

    test("returns undefined when the file does not exist", async () => {
        expect(await readAuthFile("openrouter", join(dir, "absent.json"))).toBeUndefined()
    })

    test("rejects malformed JSON so the chain can report it", async () => {
        writeFileSync(file, "{")

        await expect(readAuthFile("openrouter", file)).rejects.toThrow()
    })
})
