const mode = $arguments.mode;

const COUNTRIES = [
  { key: "Argentina",     abbr: "AR", flag: "🇦🇷", ch: "阿根廷",   en: "Argentina" },
  { key: "Brazil",        abbr: "BR", flag: "🇧🇷", ch: "巴西",     en: "Brazil" },
  { key: "Canada",        abbr: "CA", flag: "🇨🇦", ch: "加拿大",   en: "Canada" },
  { key: "Chile",         abbr: "CL", flag: "🇨🇱", ch: "智利",     en: "Chile" },
  { key: "Dubai",         abbr: "AE", flag: "🇦🇪", ch: "迪拜",     en: "Dubai" },
  { key: "France",        abbr: "FR", flag: "🇫🇷", ch: "法国",     en: "France" },
  { key: "Germany",       abbr: "DE", flag: "🇩🇪", ch: "德国",     en: "Germany" },
  { key: "HongKong",      abbr: "HK", flag: "🇭🇰", ch: "香港",     en: "Hong Kong" },
  { key: "India",         abbr: "IN", flag: "🇮🇳", ch: "印度",     en: "India" },
  { key: "Israel",        abbr: "IL", flag: "🇮🇱", ch: "以色列",   en: "Israel" },
  { key: "Japan",         abbr: "JP", flag: "🇯🇵", ch: "日本",     en: "Japan" },
  { key: "Malaysia",      abbr: "MY", flag: "🇲🇾", ch: "马来西亚", en: "Malaysia" },
  { key: "Mexico",        abbr: "MX", flag: "🇲🇽", ch: "墨西哥",   en: "Mexico" },
  { key: "Netherlands",   abbr: "NL", flag: "🇳🇱", ch: "荷兰",     en: "Netherlands" },
  { key: "Russia",        abbr: "RU", flag: "🇷🇺", ch: "俄罗斯",   en: "Russia" },
  { key: "Singapore",     abbr: "SG", flag: "🇸🇬", ch: "新加坡",   en: "Singapore" },
  { key: "Spain",         abbr: "ES", flag: "🇪🇸", ch: "西班牙",   en: "Spain" },
  { key: "SouthAfrica",   abbr: "ZA", flag: "🇿🇦", ch: "南非",     en: "South Africa" },
  { key: "Switzerland",   abbr: "CH", flag: "🇨🇭", ch: "瑞士",     en: "Switzerland" },
  { key: "Taiwan",        abbr: "TW", flag: "🇹🇼", ch: "台湾",     en: "Taiwan" },
  { key: "Thailand",      abbr: "TH", flag: "🇹🇭", ch: "泰国",     en: "Thailand" },
  { key: "Turkey",        abbr: "TR", flag: "🇹🇷", ch: "土耳其",   en: "Turkey" },
  { key: "UnitedKingdom", abbr: "UK", flag: "🇬🇧", ch: "英国",     en: "United Kingdom" },
  { key: "UnitedStates",  abbr: "US", flag: "🇺🇸", ch: "美国",     en: "United States" },
];

const byAbbr = {};
const byFlag = {};
const byZh   = {};
const byEn   = {};

// 建索引
for (const c of COUNTRIES) {
  byAbbr[c.abbr] = c;
  byFlag[c.flag] = c;
  byZh[c.ch]     = c;
  byEn[c.en]     = c;
}

const modeMap = {
  abbr: [byAbbr],
  flag: [byFlag],
  zh:   [byZh],
  en:   [byEn],
};

const nameclear = /(套餐|到期|有效|剩余|版本|已用|过期|失联|测试|官方|网址|备用|群|TEST|客服|网站|获取|订阅|流量|机场|下次|官址|联系|邮箱|工单|学术|USE|USED|TOTAL|EXPIRE|EMAIL)/i;

function nameClear(proxies) {
  return proxies.filter((proxy) => !nameclear.test(String(proxy.name || "")));
}

function getCountryCodeFromName(name) {
  name = String(name || "");
  const maps = mode && modeMap[mode]
    ? modeMap[mode]
    : [byAbbr, byZh, byFlag, byEn];

  for (const m of maps) {
    for (const key of Object.keys(m)) {
      if (name.includes(key)) {
        return m[key].abbr;
      }
    }
  }

  return null;
}

function countryRemap(proxies) {
  const country_collection = proxies.reduce((collection, proxy) => {
    const code = getCountryCodeFromName(proxy.name);

    if (!code || !byAbbr[code]) {
      return collection;
    }

    const country = collection.find((c) => c.name === code);

    if (country) {
      country.count++;
      country.info.push({
        ...proxy,
        name: `${byAbbr[code].flag} ${code} ${country.count.toString().padStart(2, "0")} @ ${proxy._subName}`,
      });
    } else {
      collection.push({
        name: code,
        count: 1,
        info: [
          {
            ...proxy,
            name: `${byAbbr[code].flag} ${code} 01 @ ${proxy._subName}`,
          },
        ],
      });
    }

    return collection;
  }, []);

  return country_collection;
}

function operator(proxies) {
  proxies = nameClear(proxies);
  const country_collection = countryRemap(proxies);
  const result = [];

  for (const country of country_collection) {
    for (const proxy of country.info) {
      result.push(proxy);
    }
  }

  return result;
}
