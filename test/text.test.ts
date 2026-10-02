import { afterAll, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { estimateFileTokens, estimateTokens, stripMentions, truncatePreview } from "../src/text.ts"

describe("estimateTokens", () => {
    test("splits at four characters per token", () => {
        expect(estimateTokens("abcdefgh")).toBe(2)
        expect(estimateTokens("abc")).toBe(1)
        expect(estimateTokens("")).toBe(0)
    })
})

describe("stripMentions", () => {
    test("removes a single mention", () => {
        const text = "hey @code-review please look"
        const result = stripMentions(text, [{ start: 4, end: 16, text: "@code-review" }])

        expect(result).toBe("hey please look")
    })

    test("removes multiple mentions regardless of order", () => {
        const text = "a @one b @two c"
        const result = stripMentions(text, [
            { start: 2, end: 6, text: "@one" },
            { start: 9, end: 13, text: "@two" },
        ])

        expect(result).toBe("a b c")
    })

    test("falls back to text matching when offsets drifted", () => {
        const result = stripMentions("xxx @zed yyy", [{ start: 0, end: 5, text: "@zed" }])

        expect(result).toBe("xxx yyy")
    })

    test("leaves text unchanged when a mention is missing entirely", () => {
        const result = stripMentions("hello world", [{ start: 0, end: 4, text: "@gone" }])

        expect(result).toBe("hello world")
    })

    test("clamps out-of-bounds offsets", () => {
        const result = stripMentions("hi @tail", [{ start: 3, end: 500, text: "@tail" }])

        expect(result).toBe("hi")
    })

    test("returns trimmed text without mentions", () => {
        expect(stripMentions("  hello  ", [])).toBe("hello")
    })
})

describe("truncatePreview", () => {
    test("collapses whitespace", () => {
        expect(truncatePreview("a\n  b\tc", 100)).toBe("a b c")
    })

    test("marks truncation with an ellipsis", () => {
        const result = truncatePreview("x".repeat(300), 50)
        expect(result.length).toBe(50)
        expect(result.endsWith("…")).toBe(true)
    })

    test("keeps short text intact", () => {
        expect(truncatePreview("short", 50)).toBe("short")
    })
})

describe("estimateFileTokens via stat", () => {
    const dir = mkdtempSync(join(tmpdir(), "jev-text-"))

    afterAll(() => {
        rmSync(dir, { recursive: true, force: true })
    })

    test("estimates from byte size for file URIs and plain paths", async () => {
        const file = join(dir, "sample.txt")
        writeFileSync(file, "x".repeat(400))

        expect(await estimateFileTokens(pathToFileURL(file).href)).toBe(100)
        expect(await estimateFileTokens(file)).toBe(100)
    })

    test("returns undefined for directories", async () => {
        expect(await estimateFileTokens(pathToFileURL(dir).href)).toBeUndefined()
    })

    test("rejects missing paths", async () => {
        await expect(estimateFileTokens(join(dir, "missing.txt"))).rejects.toThrow()
    })
})
