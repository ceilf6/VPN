// 脱敏模板：复制为本地私密副本并填写占位参数后使用。
function main(config) {
  const FRONTIER_NAME = "US-Frontier-SSH";
  const DIALER_GROUP = "Frontier-前置机场";
  const CLAUDE_GROUP = "Claude-住宅出口";
  const NORMAL_GROUP = "普通出口";

  const FRONTIER_HOST = "203.0.113.10";
  const FRONTIER_PORT = 443;
  const FRONTIER_USER = "REPLACE_WITH_VPS_USER";

  // 私密连接参数仅填写在本地副本中。
  const FRONTIER_PASS = "REPLACE_WITH_VPS_PASSWORD";

  // 前置候选名称与 TAG 订阅中的节点名称一致
  const preferredDialers = [
    "🇺🇸 美国-洛杉矶 01丨1x US",
    "🇺🇸 美国-洛杉矶 02丨1x US"
  ];

  config.proxies = config.proxies || [];
  config["proxy-groups"] = config["proxy-groups"] || [];
  config.listeners = config.listeners || [];

  config.mode = "rule";
  config.ipv6 = false;

  // 公司内网域名返回真实 IP，并使用公司 DNS
  config.dns = config.dns || {};

  config.dns["fake-ip-filter"] =
    config.dns["fake-ip-filter"] || [];

  config.dns["nameserver-policy"] =
    config.dns["nameserver-policy"] || {};


  const corpDomains = ["corp.example.com", "+.corp.example.com"];

  for (const domain of corpDomains) {
    if (!config.dns["fake-ip-filter"].includes(domain)) {
      config.dns["fake-ip-filter"].push(domain);
    }

    // 使用实际网络可达的企业 DNS；文档地址仅为占位值。
    config.dns["nameserver-policy"][domain] = [
      "192.0.2.53",
    ];
  }

  const personalDomains = ["example.net", "+.example.net"];

  for (const domain of personalDomains) {
    if (!config.dns["fake-ip-filter"].includes(domain)) {
      config.dns["fake-ip-filter"].push(domain);
    }
  }

  // VPS IP 不进入系统 TUN，避免手动 SSH 被绕进代理
  config.tun = config.tun || {};
  // MTU 1400 用于减少隧道环境的大包分片。
  config.tun.stack = "mixed";
  config.tun.mtu = 1400;
  config.tun["auto-detect-interface"] = true;
  config.tun["route-exclude-address"] =
    config.tun["route-exclude-address"] || [];

  const frontierCidr = `${FRONTIER_HOST}/32`;

  if (!config.tun["route-exclude-address"].includes(frontierCidr)) {
    config.tun["route-exclude-address"].push(frontierCidr);
  }

  const existingProxyNames = new Set(
    config.proxies.map((proxy) => proxy.name),
  );

  const dialerProxies = preferredDialers.filter((name) =>
    existingProxyNames.has(name),
  );

  if (dialerProxies.length === 0) {
    throw new Error(
      "没有找到美国前置节点，请确认 preferredDialers 中的名称与订阅节点完全一致",
    );
  }

  // 保证住宅节点名称唯一。
  config.proxies = config.proxies.filter(
    (proxy) =>
      proxy.name !== FRONTIER_NAME &&
      proxy.name !== "US-Frontier-Residential" &&
      proxy.name !== "ATT-Residential",
  );

  // 保证自定义策略组名称唯一。
  config["proxy-groups"] = config["proxy-groups"].filter(
    (group) =>
      group.name !== DIALER_GROUP &&
      group.name !== CLAUDE_GROUP &&
      group.name !== NORMAL_GROUP,
  );

  // 保证自定义监听入口名称唯一。
  config.listeners = config.listeners.filter(
    (listener) =>
      listener.name !== "frontier-airport-test" &&
      listener.name !== "claude-locked-http",
  );

  // 美国机场前置节点
  config["proxy-groups"].push({
    name: DIALER_GROUP,
    type: "select",
    proxies: dialerProxies,
  });

  config.proxies.push({
    name: FRONTIER_NAME,
    type: "socks5",
    server: FRONTIER_HOST,
    port: FRONTIER_PORT,
    username: FRONTIER_USER,
    password: FRONTIER_PASS,
    udp: false,

    // 此项保持禁用：住宅 SOCKS5 直接连接，不经过机场前置。
    // "dialer-proxy": DIALER_GROUP,
  });

  // Claude 只有住宅节点，没有普通机场 fallback
  config["proxy-groups"].push({
    name: CLAUDE_GROUP,
    type: "select",
    proxies: [FRONTIER_NAME],
  });

  // 普通网站走美国机场，也可手动切 DIRECT
  config["proxy-groups"].push({
    name: NORMAL_GROUP,
    type: "select",
    proxies: [
      DIALER_GROUP,
      "🇺🇸 美国-洛杉矶 01丨1x US",
      "🇺🇸 美国-洛杉矶 02丨1x US",
      "🇭🇰 香港 01丨1x HK",
      "🇭🇰 香港 02丨1x HK",
      "🇭🇰 香港 03丨1x HK",
      "DIRECT",
    ],
  });

  // 7898：只测试美国机场，不经过住宅 VPS
  config.listeners.push({
    name: "frontier-airport-test",
    type: "http",
    listen: "127.0.0.1",
    port: 7898,
  });

  // 7897：Claude Code 专用入口，强制住宅出口
  config.listeners.push({
    name: "claude-locked-http",
    type: "http",
    listen: "127.0.0.1",
    port: 7897,
  });

  const rules = [
    // 必须放最前面：测试入口只走美国机场
    `IN-PORT,7898,${DIALER_GROUP}`,

    // 必须放最前面：Claude Code 专用入口只走住宅出口
    `IN-PORT,7897,${CLAUDE_GROUP}`,

    // 手动连接 VPS 时保持直连
    `IP-CIDR,${FRONTIER_HOST}/32,DIRECT,no-resolve`,

    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",

    // 企业域名示例，按实际网络配置。
    "DOMAIN-SUFFIX,corp.example.com,DIRECT",

    // 个人网站与服务器直连
    "DOMAIN-SUFFIX,example.net,DIRECT",
    "IP-CIDR,198.51.100.10/32,DIRECT,no-resolve",

    // GitHub 走普通机场
    `DOMAIN-SUFFIX,github.com,${NORMAL_GROUP}`,
    `DOMAIN-SUFFIX,githubusercontent.com,${NORMAL_GROUP}`,
    `DOMAIN-SUFFIX,githubassets.com,${NORMAL_GROUP}`,
    `DOMAIN-SUFFIX,github.io,${NORMAL_GROUP}`,
    `DOMAIN,ssh.github.com,${NORMAL_GROUP}`,

    // 测试住宅出口
    `DOMAIN,api.ipify.org,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,ipinfo.io,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,ip.net.coffee,${CLAUDE_GROUP}`,

    // Claude Code 与 Claude 网页核心域名
    `DOMAIN,api.anthropic.com,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,anthropic.com,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,anthropic.ai,${CLAUDE_GROUP}`,

    // 域名后缀规则同时覆盖根域名与子域名。
    `DOMAIN-SUFFIX,claude.com,${CLAUDE_GROUP}`,

    `DOMAIN-SUFFIX,claude.ai,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,platform.claude.com,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,downloads.claude.ai,${CLAUDE_GROUP}`,
    `DOMAIN-SUFFIX,claudeusercontent.com,${CLAUDE_GROUP}`,

    // 常见大厂普通流量
    `GEOSITE,apple,${NORMAL_GROUP}`,
    `GEOSITE,microsoft,${NORMAL_GROUP}`,
    `GEOSITE,google,${NORMAL_GROUP}`,

    // 国内直连
    "GEOSITE,cn,DIRECT",
    "GEOIP,cn,DIRECT,no-resolve",

    // 非 Claude 流量走普通出口
    `MATCH,${NORMAL_GROUP}`,
  ];

  config.rules = rules;

  return config;
}
