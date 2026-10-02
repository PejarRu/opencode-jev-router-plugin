import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

export const LOG_LEVELS = ["off", "error", "warn", "info", "debug"] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export interface Logger {
    error(...args: unknown[]): void
    warn(...args: unknown[]): void
    info(...args: unknown[]): void
    debug(...args: unknown[]): void
}

export interface LoggerOptions {
    logLevel: LogLevel
    logFile: string
}

const SEVERITY = { error: 0, warn: 1, info: 2, debug: 3 } as const
type Level = keyof typeof SEVERITY

/** Report an unwritable log file at most once per process. */
let reported = false

export const noopLogger: Logger = {
    error() {},
    warn() {},
    info() {},
    debug() {},
}

function stringify(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value)
    } catch {
        return String(value)
    }
}

export function serializeArg(arg: unknown): string {
    if (typeof arg === "string") {
        return arg
    }
    if (arg instanceof Error) {
        return stringify({
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
            cause:
                arg.cause instanceof Error
                    ? { name: arg.cause.name, message: arg.cause.message }
                    : arg.cause,
        })
    }
    if (typeof arg === "object" && arg !== null) {
        return stringify(arg)
    }
    return String(arg)
}

/**
 * File logger. Writes are synchronous so lines survive a crash, filtered by
 * level, and wrapped so a failing write can never escape into a hook.
 */
export function initLogger(systemId: string, options: LoggerOptions): Logger {
    if (options.logLevel === "off") {
        return noopLogger
    }

    const threshold = SEVERITY[options.logLevel]
    let directoryReady = false

    function write(level: Level, args: unknown[]): void {
        if (SEVERITY[level] > threshold) {
            return
        }
        try {
            if (!directoryReady) {
                mkdirSync(dirname(options.logFile), { recursive: true, mode: 0o700 })
                directoryReady = true
            }
            const message = args.map(serializeArg).join(" ")
            const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${systemId}] ${message}\n`
            appendFileSync(options.logFile, line, { mode: 0o600 })
        } catch {
            // Config warnings and every diagnostic go to this logger; if it is
            // unwritable the user must still learn that, but only once.
            if (!reported) {
                reported = true
                console.error("[jev-router] cannot write log file", options.logFile)
            }
        }
    }

    return {
        error: (...args) => write("error", args),
        warn: (...args) => write("warn", args),
        info: (...args) => write("info", args),
        debug: (...args) => write("debug", args),
    }
}
