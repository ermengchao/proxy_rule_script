function operator(proxies) {
  const seen = new Set();
  const result = [];

  for (const item of proxies) {
    const parts = item.name.split(" "); 
    const flag = parts[0];     // 国旗 emoji，如 🇭🇰
    const code = parts[1];     // 国家代码，如 HK
    const countryKey = flag;   // 按国旗去重即可

    if (!seen.has(countryKey)) {
      seen.add(countryKey);

      // 构造没有编号的新名称
      result.push({
        name: `${flag} ${code}`
      });
    }
  }

  return result;
}
