"""Expose a loopback-only status and toggle API for the Surge Panel."""

from __future__ import annotations

import argparse
import fcntl
import hmac
import json
import os
import re
import signal
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
TOKEN_HEADER = "X-Agent-Tap-Token"


def recovery_path() -> Path:
    data = Path(os.environ.get("XDG_DATA_HOME") or (Path.home() / ".local" / "share")).expanduser()
    return data / "agent-tap" / "surge-recovery.json"


class Capture:
    def __init__(self, command: list[str], project: Path, viewer_port: int, journal: Path):
        self.command = command
        self.project = project
        self.viewer = f"http://{HOST}:{viewer_port}"
        self.journal = journal
        self.lock = threading.Lock()
        self.process: subprocess.Popen[str] | None = None
        self.phase = "stopped"
        self.shutting_down = False

    def _idle_state(self) -> str:
        try:
            with self.journal.with_suffix(".lock").open("rb") as handle:
                try:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    return "external"
        except FileNotFoundError:
            pass
        return "recovery" if self.journal.exists() else self.phase

    def _status(self) -> dict[str, str]:
        if self.process is not None:
            code = self.process.poll()
            if code is not None:
                self.process = None
                self.phase = "stopped" if code == 0 else "error"
        state = self.phase if self.process is not None else self._idle_state()
        reply = {"state": state}
        if state == "capturing":
            reply["viewer"] = self.viewer
        return reply

    def status(self) -> dict[str, str]:
        with self.lock:
            return self._status()

    def _observe(self, process: subprocess.Popen[str]):
        assert process.stdout is not None
        with process.stdout:
            for line in process.stdout:
                if line.strip() == f"Viewer: {self.viewer}":
                    with self.lock:
                        if self.process is process and self.phase == "starting":
                            self.phase = "capturing"
                print(line, end="", flush=True)

    def toggle(self) -> dict[str, str]:
        with self.lock:
            state = self._status()["state"]
            if self.shutting_down:
                return {"state": "stopping"}
            if state == "capturing" and self.process is not None:
                self.phase = "stopping"
                try:
                    self.process.terminate()
                except ProcessLookupError:
                    pass
            elif state in {"stopped", "error"}:
                try:
                    self.process = subprocess.Popen(
                        self.command,
                        cwd=self.project,
                        env={key: value for key, value in os.environ.items() if key != "AGENT_TAP_PANEL_TOKEN"},
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        errors="replace",
                    )
                except OSError as exc:
                    print(f"Unable to start agent-tap ({type(exc).__name__}).", flush=True)
                    self.phase = "error"
                else:
                    self.phase = "starting"
                    threading.Thread(target=self._observe, args=(self.process,), daemon=True).start()
            return self._status()

    def shutdown(self):
        with self.lock:
            self.shutting_down = True
            process = self.process
            if process is None or process.poll() is not None:
                return
            if self.phase != "stopping":
                self.phase = "stopping"
                try:
                    process.terminate()
                except ProcessLookupError:
                    return
        try:
            process.wait(timeout=45)
        except subprocess.TimeoutExpired:
            print("agent-tap is still restoring Surge; the capture process was left running.", flush=True)


def handler(capture: Capture, token: str):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond("status")

        def do_POST(self):
            self.respond("toggle")

        def respond(self, action: str):
            provided = self.headers.get(TOKEN_HEADER, "").encode("utf-8")
            if not hmac.compare_digest(provided, token.encode("ascii")):
                code, data = 401, {"error": "unauthorized"}
            elif self.path != "/" + action:
                code, data = 404, {"error": "not found"}
            else:
                code, data = 200, getattr(capture, action)()
            body = json.dumps(data).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_):
            return

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path.home() / ".local/share/repos/agent-tap")
    parser.add_argument("--port", type=int, default=19529, help="Controller port")
    parser.add_argument("--viewer-port", type=int, default=19528)
    args = parser.parse_args()
    token = os.environ.get("AGENT_TAP_PANEL_TOKEN", "")
    if not re.fullmatch(r"[a-fA-F0-9]{48}", token, flags=re.ASCII):
        parser.error("Set AGENT_TAP_PANEL_TOKEN to a token generated with openssl rand -hex 24.")
    if not os.environ.get("AGENT_TAP_SURGE_API_KEY"):
        parser.error("Set AGENT_TAP_SURGE_API_KEY before starting the controller.")
    if not (1 <= args.port <= 65535 and 1 <= args.viewer_port <= 65535 and args.port != args.viewer_port):
        parser.error("Use two different ports between 1 and 65535.")
    project = args.project.expanduser().resolve()
    python = project / ".venv/bin/python"
    if not python.is_file():
        parser.error("Run uv sync --no-editable --no-dev in the agent-tap project first.")
    command = [str(python), "-m", "agent_tap", "capture", "--no-open", "--port", str(args.viewer_port)]
    capture = Capture(command, project, args.viewer_port, recovery_path())
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    with ThreadingHTTPServer((HOST, args.port), handler(capture, token)) as server:
        server.timeout = 0.5
        print(f"agent-tap panel controller: http://{HOST}:{args.port}", flush=True)
        try:
            while not stop.is_set():
                server.handle_request()
        finally:
            capture.shutdown()


if __name__ == "__main__":
    main()
