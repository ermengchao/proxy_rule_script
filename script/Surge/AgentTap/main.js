// Name: agent-tap
// Description: Show or toggle the agent-tap capture on this Mac.
(function () {
  "use strict";
  var title = "agent-tap";
  var settings;
  try {
    settings = JSON.parse(typeof $argument === "string" ? $argument : "{}");
  } catch (_) {
    settings = {};
  }
  settings = settings || {};
  var port = Number(settings.port || 19529);
  if (!/^[a-f0-9]{48}$/i.test(settings.token || "") ||
      !Number.isInteger(port) || port < 1 || port > 65535) {
    $done({title: title, content: "Set the controller token and port in the module settings.", style: "error"});
    return;
  }

  var pressed = typeof $trigger !== "undefined" && $trigger === "button";
  var descriptions = {
    stopped: ["Stopped · Click refresh to start capture", "info"],
    starting: ["Starting capture · Check again shortly", "info"],
    capturing: ["Capturing · Click refresh to stop capture", "good"],
    stopping: ["Stopping capture and restoring Surge settings", "info"],
    external: ["Capture started in a terminal · Stop it in that terminal", "alert"],
    recovery: ["Recovery required · Run agent-tap restore", "error"],
    error: ["Capture failed · Check the controller terminal and try again", "error"]
  };
  var options = {
    url: "http://127.0.0.1:" + port + (pressed ? "/toggle" : "/status"),
    headers: {"X-Agent-Tap-Token": settings.token},
    policy: "DIRECT",
    timeout: 3,
    "auto-redirect": false
  };
  if (pressed) {
    options.headers["Content-Type"] = "application/json";
    options.body = "{}";
  }
  var method = pressed ? "post" : "get";
  $httpClient[method](options, function (error, response, data) {
    if (error || !response) {
      $done({title: title, content: "Cannot reach the local controller · Run controller.py first", style: "error"});
      return;
    }
    if (response.status === 401) {
      $done({title: title, content: "Invalid control token · Check the module settings", style: "error"});
      return;
    }
    try {
      var result = JSON.parse(data);
      var display = descriptions[result.state];
      if (response.status !== 200 || !Array.isArray(display)) throw new Error("Unexpected response");
      var address = result.viewer;
      var viewer = typeof address === "string" && /^http:\/\/127\.0\.0\.1:\d+$/.test(address)
        ? "\nViewer: " + address : "";
      $done({title: title, content: display[0] + viewer, style: display[1]});
    } catch (_) {
      $done({title: title, content: "The controller returned an unrecognized status", style: "error"});
    }
  });
})();
