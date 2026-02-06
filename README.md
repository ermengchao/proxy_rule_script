# proxy_rule_script

A personal proxy rules repository, mainly for Clash and Surge, with a file organization structure similar to [@blackmatrix7/ios_rule_script](<https://github.com/blackmatrix7/ios_rule_script>) repository.

## for Clash

Add lines below to the `config.yaml`:

```yaml
rule-providers:
  ai_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/refs/heads/main/Clash/Providers/AI.yaml
    path: ./Providers/ai_chao.yaml
    interval: 86400

  direct_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/refs/heads/main/Clash/Providers/direct.yaml
    path: ./Providers/direct_chao.yaml
    interval: 86400

  game_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/refs/heads/main/Clash/Providers/games.yaml
    path: ./Providers/game_chao.yaml
    interval: 86400

  proxy_chao:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/ermengchao/proxy_rule_script/refs/heads/main/Clash/Providers/proxy.yaml
    path: ./Providers/proxy_chao.yaml
    interval: 86400

rules:
  - RULE-SET,ai_chao,🧠 AI
  - RULE-SET,direct_chao,🟢 Direct
  - RULE-SET,game_chao,🎮 Games
  - RULE-SET,proxy_chao,🌐 Proxy
```
