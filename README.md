# PDF 工具箱小程序

这是一个微信小程序 + 轻量 Node 后端的 PDF 工具项目骨架。

## 小程序能力

- 基础工程、分包配置、相册保存权限声明
- 本地文件选择、PDF 头部校验、损坏文件提示
- PDF 压缩、合并、拆分、转图片入口
- 图片转 PDF、添加水印、PDF 旋转、页面删除入口
- 任务队列、进度条、加载态、错误提示、全局异常捕获
- 大文件分片上传到后端兜底处理

## 后端服务

```bash
cd server
npm install
npm run dev
```

默认地址是 `http://127.0.0.1:3000`。小程序端的后端地址在 `app.js` 的 `globalData.apiBaseUrl` 中配置。

后端已实现合并、拆分、水印、旋转、删页、图片转 PDF、PDF 转图片和 PDF 压缩。

PDF 转图片依赖 Poppler 的 `pdftoppm`。PDF 压缩会优先使用 Ghostscript；如果未安装 Ghostscript，会使用 QPDF 做线性化和流压缩。可通过环境变量指定工具路径：

- `PDF_TOOL_PDFTOPPM`
- `PDF_TOOL_GS`
- `PDF_TOOL_QPDF`
