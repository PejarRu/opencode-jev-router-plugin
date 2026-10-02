import { readFile } from "node:fs/promises"
import { authFile, type Env } from "./paths.ts"

export interface CredentialSource {
    readonly name: string
    read(): Promise<string | undefined>
}

export interface ResolvedKey {
    key: string
    source: string
}

/** First non-empty key wins. A failing source is reported and skipped. */
export async function resolveApiKey(
    sources: readonly CredentialSource[],
    onError: (source: string, error: unknown) => void = () => {},
): Promise<ResolvedKey | undefined> {
    for (const source of sources) {
        try {
            const key = (await source.read())?.trim()
            if (key) {
                return { key, source: source.name }
            }
        } catch (error) {
            onError(source.name, error)
        }
    }
    return undefined
}

export function envSource(name = "JEV_ROUTER_API_KEY", env: Env = process.env): CredentialSource {
    return { name: `env:${name}`, read: async () => env[name] }
}

/** Structural subset of `ctx.integration.connection`. */
export interface IntegrationConnections<C> {
    active(integrationID: string): Promise<C | undefined>
    resolve(connection: C): Promise<unknown>
}

export function keyFromCredential(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined
    }
    const { type, key } = value as { type?: unknown; key?: unknown }
    return (type === "key" || type === "api") && typeof key === "string" ? key : undefined
}

export function integrationSource<C>(
    connections: IntegrationConnections<C>,
    integrationID: string,
): CredentialSource {
    return {
        name: `integration:${integrationID}`,
        async read() {
            const connection = await connections.active(integrationID)
            if (connection === undefined) {
                return undefined
            }
            return keyFromCredential(await connections.resolve(connection))
        },
    }
}

export async function readAuthFile(
    providerID: string,
    file: string = authFile(),
): Promise<string | undefined> {
    let raw: string
    try {
        raw = await readFile(file, "utf8")
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return undefined
        }
        throw error
    }
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        // Never surface the native SyntaxError: V8 embeds a fragment of the
        // file content (potentially the API key) in its message, and the
        // credential chain logs it.
        throw new Error(`${file} is not valid JSON`)
    }
    if (typeof parsed !== "object" || parsed === null) {
        return undefined
    }
    return keyFromCredential((parsed as Record<string, unknown>)[providerID])
}

export function authFileSource(providerID: string, file: string = authFile()): CredentialSource {
    return { name: `auth.json:${providerID}`, read: () => readAuthFile(providerID, file) }
}
