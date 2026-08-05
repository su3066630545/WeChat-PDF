# PDF 工具小程序六层架构

项目采用六层分层架构，从上至下解耦，高内聚、低耦合，方便后续迭代维护。

## 1. 视图层

职责：只负责页面结构、样式和状态展示，不直接处理 PDF、不直接请求后端。

对应目录：
- `pages/**`
- `packages/tools/**/index.wxml`
- `packages/tools/**/index.wxss`

## 2. 交互逻辑层

职责：承接用户操作，串联“选择文件 -> 解析 -> 处理 -> 预览 -> 保存”的完整流程，维护加载态、骨架屏、错误弹窗和重试。

对应目录：
- `packages/tools/common/tool-page.js`
- `packages/tools/**/index.js`

## 3. PDF 核心处理层

职责：文件格式校验、PDF 头校验、本地处理入口、远端兜底策略选择。后续引入 pdfjs/pdf-lib 时只放在这一层或工具分包内，避免污染主包。

对应文件：
- `utils/pdf-core.js`
- `utils/validator.js`
- `utils/constants.js`

## 4. 请求服务层

职责：封装后端 API、分片上传、结果下载、请求错误转换。页面和交互层不直接调用 `wx.request`、`wx.uploadFile`、`wx.downloadFile`。

对应文件：
- `utils/api.js`

## 5. 数据缓存层

职责：统一管理本地状态、最近结果、任务运行标记、异常日志和任务队列；对上层隐藏 Storage 细节，便于后续切换缓存策略。

对应文件：
- `utils/cache.js`
- `utils/task-queue.js`
- `utils/monitor.js`

## 6. 服务端算力层

职责：复杂 PDF 处理兜底、大文件分片合并、Worker 线程隔离、内存限制、超时释放、异常日志接收。

对应目录：
- `server/src/routes/**`
- `server/src/services/**`
- `server/src/workers/**`

## 依赖方向

依赖只能自上而下：

```text
视图层 -> 交互逻辑层 -> PDF核心处理层 -> 请求服务层 -> 数据缓存层
                         -> 服务端算力层
```

约束：
- 首页保持纯静态，不做接口请求。
- 主包不直接引入重型 PDF 依赖。
- 工具页通过公共交互层复用流程，不在每个页面重复写处理逻辑。
- 文件路径、文件名、URL 不进入日志上报。
- 大文件处理必须走分片上传，并在分片完成后清理临时文件。
