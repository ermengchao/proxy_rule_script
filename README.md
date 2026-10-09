# proxy_rule_script

> A personal proxy rules repository, mainly for Clash and Surge, with a file organization structure similar to [@blackmatrix7/ios_rule_script](<https://github.com/blackmatrix7/ios_rule_script>) repository.

## for Clash

Merge the entries below into the `rule-providers` and `rules` sections of your `config.yaml`. Place the `RULE-SET` rules before the `MATCH` rule:

```yaml
rule-providers:
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
  - RULE-SET,ai_chao,🧠 AI
  - RULE-SET,direct_chao,🟢 Direct
  - RULE-SET,game_chao,🎮 Games
  - RULE-SET,proxy_chao,🌐 Proxy
```

Replace the policy names (`🧠 AI`, `🟢 Direct`, `🎮 Games`, and `🌐 Proxy`) with the proxies or proxy groups defined in your configuration. Use `DIRECT` for the Direct rule set if you do not have a dedicated direct proxy group.

See the [Mihomo rule provider documentation](https://wiki.metacubex.one/config/rule-providers/) and [routing rule documentation](https://wiki.metacubex.one/config/rules/) for details.

## for Surge

Add lines below to the `[Rule]` section of your Surge profile, before the `FINAL` rule:

```ini
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/AI/AI.list,🧠 AI
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Direct/Direct.list,🟢 Direct
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Game/Game.list,🎮 Games
RULE-SET,https://raw.githubusercontent.com/ermengchao/proxy_rule_script/main/rule/Surge/Proxy/Proxy.list,🌐 Proxy
```

Replace the policy names (`🧠 AI`, `🟢 Direct`, `🎮 Games`, and `🌐 Proxy`) with the policies or policy groups defined in your profile. Use `DIRECT` for the Direct rule set if you do not have a dedicated direct policy group.

See the [Surge Rule Set documentation](https://manual.nssurge.com/rules/ruleset.html) for details.
