// OpenCode v2's path-install plugin loader imports `<packageDir>/index.js`
// directly and ignores package.json `exports`/`main`. Keep this thin re-export
// at the package root so local/path installs resolve; the `exports` map still
// points TypeScript consumers and bare-name installs at `./dist/index.js`.
export { default } from "./dist/index.js"
