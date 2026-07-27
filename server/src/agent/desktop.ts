import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// A small, publicly available XFCE-over-noVNC image. Swap via DESKTOP_DOCKER_IMAGE
// if you'd rather use something else.
const DESKTOP_IMAGE = process.env.DESKTOP_DOCKER_IMAGE ?? "consol/ubuntu-xfce-vnc";
const NOVNC_CONTAINER_PORT = 6901;

export interface DesktopSession {
  containerId: string;
  url: string;
}

async function dockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Starts a fresh desktop container and returns its noVNC URL. Throws with a clear message if Docker isn't available. */
export async function startDesktop(label: string): Promise<DesktopSession> {
  if (!(await dockerAvailable())) {
    throw new Error(
      "Docker isn't available on this server — the Desktop tab needs the `docker` CLI installed and running on the host."
    );
  }

  const { stdout: containerId } = await execFileAsync("docker", [
    "run",
    "-d",
    "--rm",
    "-p",
    `0:${NOVNC_CONTAINER_PORT}`,
    "--label",
    `devin-agent=${label}`,
    DESKTOP_IMAGE,
  ]);

  const id = containerId.trim();

  const { stdout: portOutput } = await execFileAsync("docker", [
    "port",
    id,
    String(NOVNC_CONTAINER_PORT),
  ]);
  // portOutput looks like "0.0.0.0:54321"
  const hostPort = portOutput.trim().split(":").pop();
  if (!hostPort) {
    await execFileAsync("docker", ["rm", "-f", id]).catch(() => {});
    throw new Error("Container started but its noVNC port couldn't be determined.");
  }

  return { containerId: id, url: `http://localhost:${hostPort}/vnc.html?autoconnect=true` };
}

export async function stopDesktop(containerId: string): Promise<void> {
  await execFileAsync("docker", ["rm", "-f", containerId]).catch(() => {
    // already gone — fine
  });
}
