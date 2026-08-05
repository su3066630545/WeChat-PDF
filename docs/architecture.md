# PDF 工具小程序六层分层架构

项目采用六层分层架构，从上至下解耦，高内聚、低耦合，方便后续迭代维护。

## 1. 视图层（View）

职责：小程序页面、自定义组件、弹窗、进度 UI，只负责渲染，无业务逻辑。

对应范围：
- `pages/**/index.wxml`
- `pages/**/*.wxss`
- `packages/tools/**/index.wxml`
- `packages/tools/**/*.wxss`

约束：
- 不直接处理 PDF。
- 不直接请求接口。
- 不直接读写缓存。
- 不写业务判断，只根据状态渲染。

## 2. 逻辑层（Service）

职责：页面交互、参数校验、路由跳转、状态管理、用户操作监听。

对应范围：
- `packages/tools/common/tool-page.js`
- `packages/tools/**/index.js`
- `pages/**/index.js`

约束：
- 只编排流程，不实现 PDF 算法。
- 只调用 Core、Request、Store 层公开方法。
- 统一维护加载态、骨架屏、进度条、错误弹窗和重试入口。

## 3. PDF 核心处理层（Core）

职责：项目核心，本地 PDF 解析、编辑、转换算法封装。

对应范围：
- `utils/pdf-core.js`
- `utils/validator.js`
- `utils/constants.js`

约束：
- 本地 PDF 能力优先在 Core 层封装。
- Core 层决定本地处理或服务端兜底。
- 后续接入 `pdfjs`、`pdf-lib` 时放在 Core 层或工具分包内，避免污染主包。

## 4. 网络请求层（Request）

职责：接口封装、拦截器、分片上传、异常重试、弱网处理。

对应范围：
- `utils/api.js`

约束：
- 页面和逻辑层不直接调用 `wx.request`、`wx.uploadFile`、`wx.downloadFile`。
- 所有网络错误统一转换为可读错误。
- 弱网下自动重试，失败后交给逻辑层弹窗兜底。
- 分片上传后必须清理临时文件。

## 5. 数据缓存层（Store）

职责：本地临时缓存、任务队列、本地文件缓存、状态持久化。

对应范围：
- `utils/cache.js`
- `utils/task-queue.js`
- `utils/monitor.js`

约束：
- 业务代码不直接散落 `wx.getStorageSync` / `wx.setStorageSync`。
- 最近结果、任务状态、日志缓存统一由 Store 管理。
- 重复任务通过任务指纹去重。
- 日志缓存不记录文件名、路径、URL、文件内容。

## 6. 服务端算力层（Server）

职责：复杂任务兜底、大文件处理、OCR、解密、日志统计。

对应范围：
- `server/src/routes/**`
- `server/src/services/**`
- `server/src/workers/**`

约束：
- 大文件和复杂任务通过 Worker 隔离。
- Worker 必须有内存限制和超时释放。
- 上传文件进入临时目录，不写入小程序项目目录。
- OCR、解密等高成本能力后续只在 Server 层扩展。

## 调用方向

```text
View -> Service -> Core -> Request -> Server
                 -> Store
```

原则：
- 上层可以调用下层，下层不反向依赖上层。
- View 层保持轻量，首屏不发请求。
- Core 层只暴露能力接口，不关心页面 UI。
- Request 层只关心网络通信，不处理页面状态。
- Store 层统一管理缓存和任务状态。
- Server 层只做算力兜底和统计接收。
