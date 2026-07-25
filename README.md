# Fracture Portrait

> 原作：**Broken Glass Effect (on click, WebGL)**  
> 作者：[Ksenia Kondrashova / ksenia-k](https://codepen.io/ksenia-k)  
> 原始链接：https://codepen.io/ksenia-k/full/abegNPO  
> 许可证：MIT

一款使用玩家头像的触屏玻璃破裂视觉体验。轻触肖像后，裂纹从真实触点生成，
短暂停留并自动复原。

## Development

```bash
npm install
npm run dev
npm run build
```

## Identity inputs

- `?avatar_url=<public HTTPS image>`：调试头像覆盖。
- `?user_name=<name>`：调试用户名覆盖。
- Aigram 内默认读取当前玩家资料。
- 缺失或跨域失败时回退到项目发布者 `yinxinghuan` 的随包头像。
- `?baseline=1`：查看固定的原作视觉基线。

完整第三方许可见 `public/THIRD_PARTY_NOTICES.txt`。
