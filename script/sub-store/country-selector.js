const country = $arguments.country;

function operator(proxies) {
  proxies = proxies.filter(proxy => {
    return proxy.name.includes(country);
  });

  return proxies;
}
