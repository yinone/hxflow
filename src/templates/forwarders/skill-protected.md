---
name: {{name}}
description: {{description}}
---
<!-- hx-skill: {{name}} — 由 hx setup 自动生成，请勿手动修改 -->
<!-- protected: 此 skill 由框架锁定，不支持用户层或项目层覆盖 -->

先读取 `{{runtimePath}}` 的完整内容作为入口规则。按其中规则读取默认 contracts，并按命令正文继续按需读取其他 contracts，然后执行当前命令。

读取 `{{systemPath}}` 的完整内容作为指令执行（$ARGUMENTS 原样透传）。

若文件不存在，报错：`{{name}} skill 实体文件未找到，请重新安装包或运行 hx setup 修复。`
