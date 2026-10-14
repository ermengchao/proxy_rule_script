# proxy_rule_script

> A personal proxy rules repository, for Clash, Surge, and sing-box, with a file organization structure similar to [@blackmatrix7/ios_rule_script](<https://github.com/blackmatrix7/ios_rule_script>) repository.

## for Clash

Merge the entries below into the `rule-providers` and `rules` sections of your `config.yaml`. Place the `RULE-SET` rules before the `MATCH` rule:

```yaml
rule-providers:
  reject_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Clash/Reject/Reject.yaml

  ai_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Clash/AI/AI.yaml

  direct_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Clash/Direct/Direct.yaml

  game_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Clash/Game/Game.yaml

  proxy_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Clash/Proxy/Proxy.yaml

rules:
  - RULE-SET,reject_chao,REJECT
  - RULE-SET,ai_chao,🧠 AI
  - RULE-SET,direct_chao,🟢 Direct
  - RULE-SET,game_chao,🎮 Games
  - RULE-SET,proxy_chao,🌐 Proxy
```

Replace the policy names (`🧠 AI`, `🟢 Direct`, `🎮 Games`, and `🌐 Proxy`) with the proxies or proxy groups defined in your configuration. Use `DIRECT` for the Direct rule set if you do not have a dedicated direct proxy group.

The `reject_chao` provider blocks `httpdns.bilivideo.com`. Keep its `RULE-SET` entry before rules that would otherwise allow the connection, including IP-based direct rules and `MATCH`.

For clients that connect to an IP address and send `Host: httpdns.bilivideo.com`, the domain rule requires HTTP sniffing in a Mihomo (Clash Meta) core. Merge the following settings into the existing `sniffer` configuration, preserving any other protocol and port settings:

```yaml
sniffer:
  enable: true
  force-dns-mapping: true
  parse-pure-ip: true
  override-destination: false
  sniff:
    HTTP:
      ports: [80]
      override-destination: false
```

Make sure existing sniffing exclusions do not exclude this traffic. The sniffed HTTP Host is used for domain matching; `override-destination: false` preserves the original destination for connections that are allowed. Surge's `extended-matching` parameter is not used in Clash rule providers. Blocking HTTPDNS does not guarantee that an application falls back to the core's DNS resolver.

See the [Mihomo sniffing documentation](https://wiki.metacubex.one/config/sniff/) for details.

See the [Mihomo rule provider documentation](https://wiki.metacubex.one/config/rule-providers/) and [routing rule documentation](https://wiki.metacubex.one/config/rules/) for details.

## for Surge

Add lines below to the `[Rule]` section of your Surge profile, before the `FINAL` rule:

```ini
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Reject/Reject.list,REJECT
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/AI/AI.list,🧠 AI
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Direct/Direct.list,🟢 Direct
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Game/Game.list,🎮 Games
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Proxy/Proxy.list,🌐 Proxy
```

Replace the policy names (`🧠 AI`, `🟢 Direct`, `🎮 Games`, and `🌐 Proxy`) with the policies or policy groups defined in your profile. Use `DIRECT` for the Direct rule set if you do not have a dedicated direct policy group.

The Reject rule set uses the built-in `REJECT` policy; no additional policy group is needed. Place it before rules that would otherwise allow the connection, including IP-based direct rules and `FINAL`.

Its `DOMAIN,httpdns.bilivideo.com,extended-matching` entry also matches the HTTP Host header, so it can block the captured HTTPDNS requests even when the client connects directly to a server IP. These requests use plain HTTP and do not require MITM. Blocking HTTPDNS does not guarantee that an application falls back to Surge DNS.

See the [Surge domain rule documentation](https://manual.nssurge.com/rules/domain.html) for `extended-matching` details.

See the [Surge Rule Set documentation](https://manual.nssurge.com/rules/ruleset.html) for details.

## for sing-box

The JSON source rule sets contain the same active rules as the Clash and Surge files. They use rule-set format version `1`; this is separate from the sing-box application version. The commented-out `seed.siri.apple.com` entry is not included.

GitHub Actions compiles every JSON file under `rule/Sing Box/` to an `.srs` file beside it when JSON files or `.github/workflows/compile-sing-box.yml` change on `main`. You can also run **Compile sing-box rule sets** manually from the Actions tab on `main`. The workflow uses sing-box `1.14.3`, verifies the downloaded compiler against a pinned SHA-256 checksum, and commits only changed `.srs` files. Update both `SING_BOX_VERSION` and `SING_BOX_SHA256` in the workflow to upgrade the compiler.

All JSON files must compile successfully before generated files are updated. Outputs whose JSON source has been deleted or renamed are removed. The workflow needs `contents: write` and repository rules that permit its bot commit to `main`. Its output commits change only `.srs` files, which are outside the workflow's push path filters.

The example below uses compiled binary rule sets. To use JSON sources instead, change `"format": "binary"` to `"format": "source"` and each URL's `.srs` extension to `.json`. JSON source files are maintained manually; `.srs` files are generated by the workflow.

For sing-box 1.14 or later, merge the entries below into the existing `route.rule_set` and `route.rules` arrays. Keep the rules in the shown order and before any catch-all or other rules that would otherwise allow the connection. Preserve existing DNS handling and other routing rules. The binary URLs become available after the compilation workflow succeeds and publishes the generated files to `main`.

```json
{
  "route": {
    "rule_set": [
      {
        "type": "remote",
        "tag": "reject_chao",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Sing%20Box/Reject/Reject.srs",
        "http_client": { "detour": "🌐 Proxy" },
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "ai_chao",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Sing%20Box/AI/AI.srs",
        "http_client": { "detour": "🌐 Proxy" },
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "direct_chao",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Sing%20Box/Direct/Direct.srs",
        "http_client": { "detour": "🌐 Proxy" },
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "game_chao",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Sing%20Box/Game/Game.srs",
        "http_client": { "detour": "🌐 Proxy" },
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "proxy_chao",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Sing%20Box/Proxy/Proxy.srs",
        "http_client": { "detour": "🌐 Proxy" },
        "update_interval": "1d"
      }
    ],
    "rules": [
      { "network": "tcp", "port": 80, "action": "sniff", "sniffer": ["http"] },
      { "rule_set": "reject_chao", "action": "reject" },
      { "rule_set": "ai_chao", "action": "route", "outbound": "🧠 AI" },
      { "rule_set": "direct_chao", "action": "route", "outbound": "🟢 Direct" },
      { "rule_set": "game_chao", "action": "route", "outbound": "🎮 Games" },
      { "rule_set": "proxy_chao", "action": "route", "outbound": "🌐 Proxy" }
    ]
  }
}
```

Replace the outbound tags (`🧠 AI`, `🟢 Direct`, `🎮 Games`, and `🌐 Proxy`) with the outbound tags defined in your configuration, including the `http_client.detour` values. To use a direct outbound for Direct, specify that outbound's actual tag; sing-box has no implicit `DIRECT` tag. This is a configuration fragment, not a complete client configuration.

The example downloads the rule sets through `🌐 Proxy` and updates them daily. For sing-box 1.11–1.13, replace each `"http_client": { "detour": "🌐 Proxy" }` with `"download_detour": "🌐 Proxy"`. `http_client` was introduced in 1.14, which deprecated `download_detour`.

The Reject rule set blocks `httpdns.bilivideo.com` using `action: "reject"`; no block outbound is required. For clients that connect directly to an IP address with `Host: httpdns.bilivideo.com`, the HTTP sniff rule must run before Reject and any IP-based direct or catch-all rules that could allow the connection. The shown sniff rule covers plain HTTP on TCP port 80; extend its port matching if your traffic uses other ports. If equivalent HTTP sniffing already runs before these rules, reuse it. Surge's `extended-matching` is not a sing-box rule-set field. Blocking HTTPDNS does not guarantee that an application falls back to sing-box DNS.

The Direct rule set keeps `process_name: ["cloudflared"]` in a separate rule object so that either its domain rules or the process rule can match. Putting both in the same object would require both conditions. Process-name matching is supported on Linux, Windows, and macOS and requires the client to identify the connection's local process; it does not identify processes on other devices forwarding traffic through this client.

Optional: enable `experimental.cache_file.enabled` in your client configuration to persist downloaded remote rule sets.

See the official [rule-set documentation](https://sing-box.sagernet.org/configuration/rule-set/), [source format](https://sing-box.sagernet.org/configuration/rule-set/source-format/), [headless rule fields and matching logic](https://sing-box.sagernet.org/configuration/rule-set/headless-rule/), [rule actions](https://sing-box.sagernet.org/configuration/route/rule_action/), and [protocol sniffing](https://sing-box.sagernet.org/configuration/route/sniff/) for details.
