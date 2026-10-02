import { homedir } from "node:os"
import { join } from "node:path"

export type Env = Readonly<Record<string, string | undefined>>

export function dataHome(env: Env = process.env): string {
    const xdg = env.XDG_DATA_HOME
    return xdg?.startsWith("/") ? xdg : join(homedir(), ".local", "share")
}

export function stateHome(env: Env = process.env): string {
    const xdg = env.XDG_STATE_HOME
    return xdg?.startsWith("/") ? xdg : join(homedir(), ".local", "state")
}

/** OpenCode's credential store. */
export function authFile(env: Env = process.env): string {
    return join(dataHome(env), "opencode", "auth.json")
}

export function defaultLogFile(env: Env = process.env): string {
    return join(stateHome(env), "opencode", "jev-router.log")
}
