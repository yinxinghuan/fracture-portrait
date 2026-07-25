# Fracture Portrait 技术文档

> 本文在实现完成后按最终代码更新。

## 1. 技术栈

Vite 6、原生 JavaScript、CSS 与 WebGL 1。没有运行时 UI 框架；裂纹由移植自
原作的 GLSL fragment shader 渲染。

## 2. 目录结构

- `index.html`：语义化舞台、标题、幽灵手指、加载与错误状态。
- `src/main.js`：身份读取、图片预处理、WebGL 初始化、状态机、输入与音频。
- `src/shaders.js`：原作顶点与片元 shader。
- `src/style.css`：全屏构图、响应式标题、幽灵手指与状态样式。
- `src/shared/runtime/bridge.ts`：Aigram 当前用户资料调用桥。
- `public/`：原作基线图片、用户提供的 AlterU 默认头像和海报。
- `upstream/`：固定的 CodePen 源码快照和署名许可记录。

## 3. 核心模块

- 状态机：`intact → cracking → holding → restoring → intact`，由
  `requestAnimationFrame` 更新 shader uniform。
- 屏幕适配：头像先画入与当前 canvas 等比例的离屏 Canvas，保证 shader 的
  UV 输入在竖屏上仍可覆盖且不产生边缘拉伸。
- 身份读取：`avatar_url/user_name` 调试覆盖优先；平台内通过 Aigram bridge 的
  `/note/telegram/user/get/info/by/telegram_id` 读取当前用户，并要求返回
  `user_name`；头像可独立回退到随包图片。平台外预览文字为 `AlterU`。
- 渲染：WebGL 全屏 triangle strip，DPR 上限 2；页面隐藏时暂停。
- 音频：首次真实输入后用 Web Audio 合成短促破裂与复原音。
- 多语言：产品界面只有错误恢复文案，按 `game_locale` 或浏览器语言切换中英。

## 4. 扩展点

- 改破裂形态：编辑 `src/shaders.js` 中的扇区数、裂纹函数与位移函数。
- 调整时序：编辑 `src/main.js` 顶部 `TIMING`。
- 换头像裁切：编辑 `createViewportTextureCanvas()`。
- 增加平台身份字段：只修改 `resolveIdentity()`，不要改 runtime bridge。
- 改 UI 与响应式：编辑 `src/style.css`，保持中间触控区无常驻控件。
