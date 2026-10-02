import { describe, expect, test } from "bun:test"
import { homedir } from "node:os"
import { join } from "node:path"
import { authFile, defaultLogFile } from "../src/paths.ts"

describe("paths", () => {
    test("honors XDG base directories", () => {
        expect(authFile({ XDG_DATA_HOME: "/x/data" })).toBe("/x/data/opencode/auth.json")
        expect(defaultLogFile({ XDG_STATE_HOME: "/x/state" })).toBe(
            "/x/state/opencode/jev-router.log",
        )
    })

    test("falls back to ~/.local when XDG variables are unset or empty", () => {
        expect(authFile({})).toBe(join(homedir(), ".local/share/opencode/auth.json"))
        expect(defaultLogFile({ XDG_STATE_HOME: "" })).toBe(
            join(homedir(), ".local/state/opencode/jev-router.log"),
        )
    })

    test("ignores relative XDG values per the XDG spec", () => {
        expect(authFile({ XDG_DATA_HOME: "data" })).toBe(
            join(homedir(), ".local/share/opencode/auth.json"),
        )
        expect(defaultLogFile({ XDG_STATE_HOME: "tmp" })).toBe(
            join(homedir(), ".local/state/opencode/jev-router.log"),
        )
    })
})
