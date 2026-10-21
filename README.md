# 衡图

按世界银行最新指标为世界各国分级设色。可切换指标、平移缩放，并查看所选经济体的排名、中位数和近年走势。

数据来自 [World Bank Open Data](https://data.worldbank.org/)，数据库更新于 2026-10-08。地图取各国 2016–2025 年间最近一次有值的年份，年份标在数值旁。边界采用 Natural Earth，仅用于指标上色。

## 运行

需要 [Node.js 22](https://nodejs.org) 或更新版本。解压后：

- macOS / Linux：`./start.sh`
- Windows：双击 `start.bat`

第一次会自动安装依赖。浏览器打开 http://127.0.0.1:8080 。顶部切换指标，拖拽或滚轮查看地图，点击国家打开详情。
