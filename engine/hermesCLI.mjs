/**
 * Hermes CLI Bridge
 *
 * Replaces the deprecated Hermes HTTP API server with direct CLI calls.
 * Tasks run in background child processes; status is polled via run registry.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Resolve the `hermes` binary
// ---------------------------------------------------------------------------
function findHermes() {
  // 1. Check HERMES_BIN env var first (set by Sevancio setup wizard)
  const envBin = process.env.HERMES_BIN || process.env.SEVANCIO_HERMES_BIN;
  if (envBin) {
    try { if (fs.existsSync(envBin)) return envBin; } catch { /* ignore */ }
  }

  // 2. Check common locations
  const candidates = [
    "hermes",
    path.join(os.homedir(), ".local", "bin", "hermes"),
    path.join(os.homedir(), "AppData", "Local", "hermes", "bin", "hermes.exe"),
    path.join(os.homedir(), "AppData", "Local", "Programs", "hermes", "hermes.exe"),
    // Hermes-agent venv (common Windows install path)
    path.join(os.homedir(), "AppData", "Local", "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe"),
    path.join(os.homedir(), "AppData", "Local", "hermes", "hermes-agent", "venv", "bin", "hermes"),
  ];
  for (const base of candidates) {
    for (const ext of ["", ".cmd", ".exe", ".bat"]) {
      const p = base + ext;
      try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
    }
  }
  return process.platform === "win32" ? "hermes.cmd" : "hermes";
}

let _hermesPath = null;
function hermesPath() {
  if (!_hermesPath) _hermesPath = findHermes();
  return _hermesPath;
}

// ---------------------------------------------------------------------------
// Run registry (in-memory, similar to the API server)
// ---------------------------------------------------------------------------
const runs = new Map();

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export async function checkHermesAvailable() {
  try {
    const bin = hermesPath();
    const { stdout } = await spawnCollect(bin, ["--version"], { timeout: 10_000 });
    const version = (stdout || "").trim();
    return { ok: true, version: version || "unknown", bin };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Run a task in the background
// Returns immediately with a run_id. The Hermes process runs detached.
// ---------------------------------------------------------------------------
export function runTask(taskInput, { sessionId } = {}) {
  const runId = `cli-${randomUUID().slice(0, 8)}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-cli-"));

  // Write task to temp file to avoid shell-escaping issues
  const inputFile = path.join(tmpDir, "prompt.txt");
  fs.writeFileSync(inputFile, taskInput, "utf-8");
  const outputFile = path.join(tmpDir, "output.txt");

  const bin = hermesPath();
  const args = ["-p", taskInput];
  if (sessionId) args.push("--session", sessionId);
  // Force non-interactive JSON output
  args.push("--json");

  console.log(`[hermesCLI] spawning: ${bin} ${args.join(" ")}`);

  const run = {
    id: runId,
    task: taskInput,
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    output: "",
    error: null,
    outputFile,
    tmpDir,
    child: null,
  };
  runs.set(runId, run);

  // Spawn detached so it runs in background
  const child = spawn(bin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    detached: true,
  });
  run.child = child;

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    // Save partial output so polling can see progress
    try { fs.writeFileSync(outputFile, stdout, "utf-8"); } catch { /* ignore */ }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  child.on("error", (err) => {
    run.status = "failed";
    run.error = err.message;
    run.finishedAt = Date.now();
    try { fs.writeFileSync(outputFile, stdout + "\n[ERROR]\n" + err.message, "utf-8"); } catch { /* ignore */ }
  });

  child.on("close", (code) => {
    run.output = stdout;
    run.status = code === 0 ? "completed" : "failed";
    run.finishedAt = Date.now();
    if (code !== 0 && !run.error) {
      run.error = `Hermes exited with code ${code}\n${stderr.slice(0, 500)}`;
    }
    fs.writeFileSync(outputFile, stdout, "utf-8");
    console.log(`[hermesCLI] run ${runId} finished: ${run.status} (code ${code})`);

    // Clean up temp dir after a delay
    setTimeout(() => {
      try { fs.rmSync(run.tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }, 30_000);
  });

  // Unref so the process doesn't keep the app alive
  child.unref();

  return {
    run_id: runId,
    id: runId,
    status: "running",
    message: "Task dispatched to Hermes CLI.",
  };
}

// ---------------------------------------------------------------------------
// Get run status (polling endpoint)
// ---------------------------------------------------------------------------
export function getRunStatus(runId) {
  const run = runs.get(runId);
  if (!run) return null;
  return {
    run_id: run.id,
    id: run.id,
    status: run.status,
    task: run.task,
    output: run.output,
    error: run.error,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
  };
}

// ---------------------------------------------------------------------------
// List recent runs
// ---------------------------------------------------------------------------
export function listRuns() {
  return Array.from(runs.values()).map((r) => ({
    run_id: r.id,
    status: r.status,
    task: r.task?.slice(0, 80),
    started_at: r.startedAt,
  }));
}

// ---------------------------------------------------------------------------
// Utility: spawn and collect (synchronous)
// ---------------------------------------------------------------------------
function spawnCollect(command, args, { timeout = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      reject(new Error(`Hermes timed out after ${timeout}ms`));
    }, timeout);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code === 0 || code === null) resolve({ stdout, stderr, code });
      else reject(new Error(`Hermes exited ${code}:\n${stderr.slice(0, 500)}`));
    });
  });
}
