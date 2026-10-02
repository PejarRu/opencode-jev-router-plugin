import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { initLogger, noopLogger, serializeArg } from "../src/logger.ts"

let dir: string

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "jev-logger-"))
})

afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
})

function lines(file: string): string[] {
    return readFileSync(file, "utf8").trim().split("\n")
}

describe("initLogger", () => {
    test("writes only lines at or above the configured level", () => {
        const file = join(dir, "nested", "router.log")
        const logger = initLogger("test", { logLevel: "warn", logFile: file })

        logger.debug("d")
        logger.info("i")
        logger.warn("w")
        logger.error("e")

        const written = lines(file)
        expect(written).toHaveLength(2)
        expect(written[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T[^\]]+Z\] \[WARN\] \[test\] w$/)
        expect(written[1]).toEndWith("[ERROR] [test] e")
    })

    test("debug level writes every line", () => {
        const file = join(dir, "router.log")
        const logger = initLogger("test", { logLevel: "debug", logFile: file })

        logger.debug("d")
        logger.info("i")
        logger.warn("w")
        logger.error("e")

        expect(lines(file)).toHaveLength(4)
    })

    test("off returns the noop logger and creates no file", () => {
        const file = join(dir, "off.log")
        const logger = initLogger("test", { logLevel: "off", logFile: file })

        logger.error("x")

        expect(logger).toBe(noopLogger)
        expect(existsSync(file)).toBe(false)
    })

    test("creates the log file readable by the owner only", () => {
        const file = join(dir, "private.log")
        initLogger("test", { logLevel: "error", logFile: file }).error("x")

        expect(statSync(file).mode & 0o077).toBe(0)
    })

    test("never throws when the log path is unusable", () => {
        const blocker = join(dir, "blocker")
        writeFileSync(blocker, "")
        const logger = initLogger("test", { logLevel: "debug", logFile: join(blocker, "x.log") })

        expect(() => logger.error("boom")).not.toThrow()
    })
})

describe("serializeArg", () => {
    test("passes strings through and stringifies objects", () => {
        expect(serializeArg("plain")).toBe("plain")
        expect(serializeArg({ a: 1 })).toBe('{"a":1}')
        expect(serializeArg(42)).toBe("42")
    })

    test("serializes errors with name, message and cause", () => {
        const parsed = JSON.parse(serializeArg(new Error("bad", { cause: "root" })))
        expect(parsed).toMatchObject({ name: "Error", message: "bad", cause: "root" })
    })

    test("falls back to String() for values JSON cannot encode", () => {
        const circular: Record<string, unknown> = {}
        circular.self = circular
        expect(serializeArg(circular)).toBe("[object Object]")
    })
})
