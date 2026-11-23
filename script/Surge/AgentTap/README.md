# agent-tap Surge Panel

This module adds an agent-tap card to Surge for Mac. Opening the **Panels** menu checks the capture status. Clicking the card's refresh button starts or stops capture. When you stop capture, agent-tap exits gracefully and restores the Surge settings it changed during that session. The controller keeps running so you can start capture again.

## Local Setup

Install the agent-tap runtime dependencies and replace the example Surge HTTP API URL with the one configured in Surge.

```fish
cd /Users/chao/.local/share/repos/agent-tap
uv sync --no-editable --no-dev
set -gx AGENT_TAP_SURGE_API_URL http://127.0.0.1:6171
read -sx -P 'Surge HTTP API key: ' AGENT_TAP_SURGE_API_KEY
set -gx AGENT_TAP_PANEL_TOKEN (openssl rand -hex 24)
printf '%s' "$AGENT_TAP_PANEL_TOKEN" | pbcopy
python3 /Users/chao/.local/share/repos/proxy_rule_script/script/Surge/AgentTap/controller.py
```

Import and enable `AgentTap.sgmodule` from this directory in Surge. Paste the control token from your clipboard into the module's `controlToken` parameter. The default `scriptPath` points to a local path in this repository. If you move the repository, update that parameter. Keep the terminal running the controller open.

- The control API listens on `127.0.0.1:19529` by default and uses a token separate from the Surge HTTP API key. To change the control port, use `controller.py --port` and update the module's `controlPort` to match.
- Once capture starts, the card displays the web viewer URL, which defaults to `http://127.0.0.1:19528`. Use `--viewer-port` to change it.
- If your version of Surge for Mac shows the card without a manual refresh button, run the command below in another terminal with the same control token to start or stop capture. Use `GET /status` to check the current status.

```fish
curl -fsS --noproxy '*' -X POST -H "X-Agent-Tap-Token: $AGENT_TAP_PANEL_TOKEN" http://127.0.0.1:19529/toggle
```

If the card indicates that recovery is required, run `uv run --no-editable agent-tap restore` from the agent-tap project directory with the same Surge API configuration. If you started capture in another terminal, stop it in that terminal.
