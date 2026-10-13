# proxy_rule_script

> A personal proxy rules repository, mainly for Clash and Surge, with a file organization structure similar to [@blackmatrix7/ios_rule_script](<https://github.com/blackmatrix7/ios_rule_script>) repository.

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
