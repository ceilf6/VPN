# VPN 使用记录

## 2026-11-02（上海时间2026-11-03）

同日事件按发生顺序记录。

1. **iKuuu 流量基本耗尽**：原套餐每月300GB，开始寻找替代机场。
2. **iKuuu 官网访问异常**：`ikuuu.club`出现`ERR_TIMED_OUT`；用户反馈官网疑似被墙、访问不稳定，具体原因未核实。
3. **排除69云作为稳定主力**：查询测评后发现较低稳定性评价与高倍率计费问题，暂不选择。[测评依据](docs/2026-11-02-airport-selection.md)
4. **确认选型需求**：上海移动，每月约300GB，稳定性优先；将TAG列为短期试用候选。
5. **核对TAG套餐**：Bronze为¥185／季、250GB／月；Silver为¥114／月、500GB／月。建议首次Silver月付，购买及导入结果待确认。[套餐比较](docs/2026-11-02-airport-selection.md#tag-商店截图核对bronze-与-silver)
6. **回查iKuuu账户**：`ikuuu.top/user`可打开，已用300.03GB、剩余1.89GB，专业版2027-01-14到期；不能据此前官网超时认定整体停运。[截图数据](docs/2026-11-02-airport-selection.md#ikuuu-账户截图核对)
7. **TAG订阅与导入**：用户确认已订阅TAG，并成功导入Clash Verge；具体套餐、付款金额和本地稳定性未确认。
8. **适配全局扩展脚本**：将iKuuu写死的节点名替换为TAG美国洛杉矶01／02和香港01～03，保留住宅SOCKS5直连及原有分流方式；生成的私密脚本未自动覆盖应用设置。
9. **归档脱敏配置**：保存[TAG脚本模板](scripts/clash-verge-global.tag.example.js)及[配置说明](docs/clash-verge-tag.md)。住宅VPS的配置与维护见[IP-USA仓库（VPS）](https://github.com/ceilf6/IP-USA)。
