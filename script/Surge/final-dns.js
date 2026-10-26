// Name: Final DNS
// Description: Synchronize or toggle Final and the default DNS resolver.
// Requires the existing profile's Cloudflare default and DNS routing rules.
// Panel auto-refresh is read-only. A button press repairs a mismatch or toggles.
(function () {
  "use strict";
  var GROUP = "🐟 Final";
  var DIRECT = "🟢 Direct";
  var PROXY = "🌐 Proxy";
  var MODULE = "AliDNS";
  var LOCK = "final-dns-switch-lock";
  var lockOwner = null;
  var finished = false;

  function end(result) {
    if (finished) return;
    finished = true;
    if (lockOwner && $persistentStore.read(LOCK) === lockOwner) {
      $persistentStore.write(null, LOCK);
    }
    $done(result);
  }

  function api(method, path, body) {
    return new Promise(function (resolve, reject) {
      try {
        $httpAPI(method, path, body || {}, function (result) {
          if (!result || typeof result !== "object" || result.error) {
            reject(new Error(path + ": " + JSON.stringify(result)));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function normalized(name) {
    return String(name).split("/").pop().replace(/\.sgmodule$/, "");
  }

  async function state() {
    // selectGroupDetails().decisions can retain a choice from an older profile.
    // The HTTP API returns the current valid selection shown in Surge's UI.
    var selection = await api("GET", "/v1/policy_groups/select", {group_name: GROUP});
    var policy = selection.policy;
    if (policy !== DIRECT && policy !== PROXY) {
      throw new Error("Policy group missing or selection unsupported: " + GROUP);
    }
    var modules = await api("GET", "/v1/modules");
    if (!Array.isArray(modules.available) || !Array.isArray(modules.enabled)) {
      throw new Error("Unexpected response from the modules API");
    }
    var keys = modules.available.filter(function (name) {
      return normalized(name) === MODULE;
    });
    if (keys.length !== 1) {
      throw new Error("Import exactly one " + MODULE + " module first");
    }
    return {
      policy: policy,
      key: keys[0],
      ali: modules.enabled.some(function (name) {
        return normalized(name) === MODULE;
      })
    };
  }

  function consistent(value) {
    return value.ali === (value.policy === DIRECT);
  }

  function panel(value, prefix) {
    var action = typeof $environment !== "undefined" && $environment.system === "macOS" ?
      "Run the Mac launcher to " : "Press refresh to ";
    return {
      title: "Final & DNS",
      content: (prefix ? prefix + "\n" : "") +
        "Final: " + value.policy + "\n" +
        "Default DNS: " + (value.ali ? "AliDNS DoH (Direct)" : "Cloudflare DoH (Proxy)") + "\n" +
        (consistent(value) ? action + "switch" : "States are out of sync. " + action + "synchronize"),
      style: consistent(value) ? "good" : "alert"
    };
  }

  async function setModule(key, enabled) {
    var body = {};
    body[key] = enabled;
    await api("POST", "/v1/modules", body);
  }

  async function setPolicy(policy) {
    await api("POST", "/v1/policy_groups/select", {group_name: GROUP, policy: policy});
  }

  async function run() {
    // Guard against accidental execution from the editor or periodic refresh.
    var pressed = (typeof $trigger !== "undefined" && $trigger === "button") ||
      (typeof FINAL_DNS_ACTION !== "undefined" && FINAL_DNS_ACTION === "toggle");
    if (!pressed) {
      var current = await state();
      end(panel(current));
      return;
    }

    var existing = $persistentStore.read(LOCK);
    if (existing && Date.now() - Number(existing.split(":")[0]) < 20000) {
      end({title: "Final & DNS", content: "A switch is in progress. Refresh again shortly.", style: "info"});
      return;
    }
    lockOwner = Date.now() + ":" + Math.random();
    if (!$persistentStore.write(lockOwner, LOCK)) throw new Error("Could not acquire the switch lock");

    var outbound = await api("GET", "/v1/outbound");
    if (outbound.mode !== "rule") throw new Error("Set Surge outbound mode to Rule-Based first");
    var before = await state();
    // On first installation or a manual group change, synchronize to that group.
    var targetDirect = consistent(before) ? before.policy !== DIRECT : before.policy === DIRECT;
    var targetPolicy = targetDirect ? DIRECT : PROXY;
    var attempted = false;
    try {
      attempted = true;
      await setModule(before.key, targetDirect);
      var afterModule = await state();
      if (afterModule.ali !== targetDirect) throw new Error("The DNS module state did not change");
      await setPolicy(targetPolicy);
      var after = await state();
      if (after.policy !== targetPolicy || after.ali !== targetDirect) {
        throw new Error("The resulting policy and module states do not match the target");
      }
      await api("POST", "/v1/dns/flush");
      end(panel(after, consistent(before) ? "Switched and flushed the DNS cache" : "Synchronized and flushed the DNS cache"));
    } catch (error) {
      var recovered = false;
      if (attempted) {
        try {
          await setModule(before.key, before.ali);
          await setPolicy(before.policy);
          await api("POST", "/v1/dns/flush");
          var restored = await state();
          recovered = restored.policy === before.policy && restored.ali === before.ali;
        } catch (rollbackError) {
          console.log("final-dns rollback: " + String(rollbackError));
        }
      }
      end({
        title: "Final & DNS: Switch failed",
        content: String(error.message || error) + "\n" +
          (recovered ? "Restored the previous policy and module states" : "Check the Final selection and AliDNS module manually"),
        style: "error"
      });
    }
  }

  run().catch(function (error) {
    end({title: "Final & DNS", content: String(error.message || error), style: "error"});
  });
})();
