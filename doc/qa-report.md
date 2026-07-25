# Fracture Portrait 视觉 QA

## Context

- 构建：本地 Vite 产品模式与 `?baseline=1`
- 目标：全屏肖像构图、真实触点裂纹、自动复原、身份输入与短屏安全区
- 视口：390×844、320×568
- 证据：`_qa/ui/`

## Executive assessment

- 决策：通过
- 最强质量：原作裂纹数学在真实触点形成清晰、克制且足够强的视觉事件。
- 最大风险：平台顶部外壳会覆盖过高的标题。
- 首轮问题：P0 0 / P1 1 / P2 0
- 修复后：P0 0 / P1 0 / P2 0

## Scorecard

| Category | Score | Evidence | Required action |
|---|---:|---|---|
| Hierarchy | 4 | 全屏肖像和裂纹优先，标题次之 | 无 |
| Coherence | 5 | 黑色展陈空间、衬线标题与玻璃事件一致 | 无 |
| Readability | 4 | 两档手机均可读，长姓名正确省略 | 无 |
| Game feel | 4 | 同帧确认，180ms 破裂，自动复原 | 无 |
| Asset quality | 4 | 头像纹理覆盖稳定，无边缘拉伸 | 无 |
| Responsive UX | 4 | 390×844 与 320×568 均通过 | 无 |
| Polish | 4 | 没有额外碎片、泛光或粗糙面板 | 无 |

最终平均分：4.14。

## Findings and iteration

### 已修复 P1：短屏标题被平台外壳遮挡

- 位置：320×568 入口与破裂态。
- 首轮证据：`320x568-intact-first.png`、`320x568-crack-first.png`。
- 观察：`VISUAL STUDY / 01` 的前两个字母被顶部外壳遮住。
- 修复：短屏标题从安全区下方 48px 调整为 56px。
- 复验证据：`320x568-intact-fixed.png`、`320x568-crack-fixed.png`。

## Foundation audit

- 功能 Emoji：无。
- 图标：仅 Google Material `touch_app` 单一 SVG。
- 触控目标：整个视口；错误恢复按钮 44px。
- 对比：米白文字对黑色背景通过；状态不只依赖颜色。
- 输入：单一 `pointerdown`，键盘 Space / Enter 可用。
- 状态：加载、完整、破裂、复原、错误、AlterU 默认头像、基线均有证据。
- 本地化：中英错误文案；长中英文姓名均使用省略。

## Final recommendation

无低于 3 分的分类，P0/P1 已清零，可以进入发布校验。
