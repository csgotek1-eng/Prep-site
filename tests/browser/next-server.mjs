/**
 * Starting and stopping `next start` for the browser suites, on every
 * platform the team actually uses.
 *
 * Each of the six suites used to do this itself, identically, and the
 * three lines they shared were all POSIX-only:
 *
 *   spawn("npx", ["next", "start", ...])   npx on Windows is a shell
 *                                          script; spawn without a
 *                                          shell cannot execute it and
 *                                          dies with ENOENT before a
 *                                          single assertion runs.
 *   detached: true                         Windows has no process
 *                                          groups to detach into.
 *   process.kill(-server.pid, "SIGTERM")   a negative pid is a
 *                                          process-group signal, which
 *                                          Windows does not have, so
 *                                          the server survived the run.
 *
 * The fix for the first one is not to reach for a shell. npx exists to
 * find a binary; we already know where it is, so the CLI is invoked
 * directly on the current Node executable. That removes a process and a
 * shell from every run on Linux and macOS too, and sidesteps the
 * argument-escaping hazard that `shell: true` would have introduced.
 *
 * Nothing here changes what the suites assert.
 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** The Next CLI entry point, as a plain file for `node` to run. */
const NEXT_BIN = require.resolve("next/dist/bin/next");

const IS_WINDOWS = process.platform === "win32";

/**
 * Spawn `next start` on `port` with `env`, stdout and stderr piped so
 * the caller can keep the log for a failure message.
 */
export function startNextServer(port, env) {
  return spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    // POSIX: its own process group, so one signal reaches the whole
    // tree. Windows: taskkill /T walks the tree instead — see below.
    detached: !IS_WINDOWS,
  });
}

/**
 * Stop the server and everything it started. Safe to call twice, and
 * safe to call on a process that has already exited — these run from
 * `process.on("exit")`, where throwing would mask the real failure.
 */
export function stopNextServer(child) {
  if (!child || child.pid === undefined) return;
  if (child.exitCode !== null || child.signalCode !== null) return;

  if (IS_WINDOWS) {
    try {
      // /T the whole tree, /F because next start ignores a polite ask.
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      return;
    } catch {
      /* already gone, or never started — fall through */
    }
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      /* no process group — fall through */
    }
  }

  try {
    child.kill("SIGTERM");
  } catch {
    /* nothing left to kill */
  }
}
