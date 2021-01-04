> 作为 Android 开发者常常为添加gradle依赖烦恼，本工具可快速查询gradle依赖并粘贴到项目中

[项目完整介绍](https://juejin.im/post/5e37d6b06fb9a02fb96566ba)

### gradle依赖查询工具

本插件提供

 `maven center` 
 `google`
 `jcenter`

依赖查询

输入 `jcenter` / `maven` / `google` / `gradle` 唤出 输入关键词搜索并选中结果粘贴到剪切板

`jcenter` 命令对应 `jcenter repository`

`gradle` 命令对应 `maven center repository` 并会复制出 gradle 格式的结果

`gogole` 命令对应 `google maven repository`

`maven` 命令对应 `maven center repository` 并会复制出 maven 格式的结果

### 演示
![](./demo.gif)

[视频演示](https://www.bilibili.com/video/av86491319/?p=2)

### todo

- `jitpack repository` 查询
- 依赖历史版本list
