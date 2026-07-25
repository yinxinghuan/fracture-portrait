# Fracture Portrait 视觉文档

## 1. Visual thesis

- 游戏与受众：信息流中的移动端用户，停留 8–15 秒即可获得完整体验。
- 情绪承诺：自己的肖像像一整块玻璃一样被触碰、裂开、恢复。
- 一句话方向：一张冷静的全屏肖像，被一次精确而锋利的玻璃事件打断。
- 记忆点：裂纹从玩家实际按下的位置贯穿自己的脸。
- 必须具备：真实肖像、细密裂纹、克制界面。
- 避免方向：飞散假碎片、霓虹泛光、手机设备外框。

## 2. Composition and camera

- 竖屏优先，覆盖 320×568、390×844，并适配横屏桌面。
- WebGL 正交全屏平面；头像预处理成当前视口比例后再作为纹理上传。
- 肖像位于全屏中景；标题在顶部安全区，身份标签贴近底部安全区。
- 手指路径与主要脸部区域重合，UI 不进入中间 70% 的触控区域。
- 视觉顺序：肖像眼睛 → 裂纹中心 → 顶部标题 → 底部姓名。

## 3. Color

- 背景 `#08090b`，主文字 `#f4f0e8`，弱文字 `rgba(244,240,232,.58)`。
- 裂纹颜色完全来自原作 shader 对肖像取样和透明度削减，不另染色。
- UI 仅使用米白和黑色遮罩；禁止彩虹渐变、蓝紫霓虹和玻璃面板。

## 4. Typography

- Display：`Bodoni Moda` 风格的高对比衬线系统回退
  `Didot, Bodoni 72, Times New Roman, Noto Serif SC, serif`。
- UI：`Inter, Helvetica Neue, PingFang SC, sans-serif`。
- 标题 54–88px、500、0.02em、全大写；身份 11px、600、0.18em。
- 长用户名限制一行，最大 28 个显示字符，使用省略号。

## 5. Shape, material, and lighting

- 唯一显著形状是原作放射与网格裂纹；UI 不使用圆角卡片。
- 标题无描边、无发光、无阴影；底部标签只使用 1px 顶边。
- 头像背景层使用轻微暗化与模糊，前景保持肤色和锐度。

## 6. Characters, environments, and assets

- 玩家头像为产品模式主内容；`?avatar_url` 可覆盖用于测试。
- 无玩家头像或纹理跨域失败时，使用随包发布的发布者头像
  `public/publisher-avatar.png`，来源为 `https://github.com/yinxinghuan.png`。
- `?baseline=1` 使用 `public/upstream-original.jpg`。
- 头像采用居中 cover 裁切；不把 HDR、normal、roughness 或 LUT 当头像入口。

## 7. UI and icons

- 无常驻功能按钮，避免与视觉主体竞争。
- 幽灵手指使用项目共同采用的 Google Material touch-app SVG 轮廓。
- 可交互区域为整个视口，最小目标远大于 44×44px。
- 加载时显示窄线进度；错误态提供 44px 高的“重新载入”按钮。
- 禁止 Emoji 作为功能图标。

## 8. Motion and VFX

- 输入确认 0–16ms；破裂 180ms；保持 1,350ms；复原 900ms。
- 缓动：破裂 `cubicOut`，复原 `sineInOut`。
- 不添加粒子和屏幕震动；原作 shader 的像素位移承担冲击。
- `prefers-reduced-motion` 下破裂 80ms、保持 700ms、复原 180ms；
  幽灵手指不自动播放。

## 9. References translated into principles

- 参考：Ksenia Kondrashova 的 “Broken Glass Effect (on click, WebGL)”。
- 有效原则：用扇区随机、噪声网格和中心裂缝共同制造非规则玻璃破裂。
- 适配：保留 shader 数学，输入图改为玩家头像，点击改为有闭环的破裂时序。
- 不复制：CodePen 提示文字、lil-gui 调参面板和演示站点外壳。

## 10. Anti-patterns

- 禁止视频播放按钮、设备模型、Emoji、胶囊按钮和通用毛玻璃 HUD。
- 禁止假 3D 碎片、彩色粒子、过强暗角和多层泛光。
- 禁止用原作照片冒充产品默认内容；禁止头像失败后无声留黑。

## 11. Vertical-slice acceptance

- 入口：头像加载完成后先保持完整，标题可读。
- 游戏：真实单指触点成为裂纹中心。
- 高反馈：180ms 内形成完整裂纹但不出现额外假碎片。
- 完成：2.43 秒内自动回到完整状态。
- 窄屏：320×568 不裁掉标题、姓名或脸部核心区域。
- 视觉 QA：要求第一次和修复后的同状态截图，平均分至少 4，无 P0/P1。

