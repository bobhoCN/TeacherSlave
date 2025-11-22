# Linux 一键启动脚本使用说明

## 文件说明

本项目提供了Linux系统的一键启动脚本，方便在Linux环境下快速启动数学作业批改系统。

- **start.sh** - 启动脚本
- **stop.sh** - 停止脚本

## 快速开始

### 1. 启动系统

在项目根目录下运行：

```bash
./start.sh
```

### 2. 停止系统

在项目根目录下运行：

```bash
./stop.sh
```

## 启动脚本功能

`start.sh` 脚本会自动执行以下操作：

1. ✅ 检查系统文件（index.html、package.json）
2. ✅ 检查 Node.js 是否已安装
3. ✅ 检查 npm 是否可用
4. ✅ 自动安装依赖（如果未安装）
5. ✅ 检查并清理端口 3000 上的占用进程
6. ✅ 启动代理服务器
7. ✅ 验证服务器运行状态
8. ✅ 自动打开浏览器（如果支持）

## 系统要求

- Linux 操作系统
- Node.js >= 14.0.0
- npm
- curl（用于健康检查）
- lsof（用于端口检查）

## 端口信息

- **服务端口**: 3000
- **前端地址**: http://localhost:3000/index.html
- **API地址**: http://localhost:3000/api

## 文件位置

- **PID文件**: `server.pid` - 保存服务器进程ID
- **日志文件**: `server.log` - 服务器运行日志

## 常见问题

### Q: 提示权限不足怎么办？
A: 给脚本添加执行权限：
```bash
chmod +x start.sh stop.sh
```

### Q: 端口3000被占用怎么办？
A: 启动脚本会自动检查并清理占用端口的进程，你也可以手动运行：
```bash
./stop.sh
```

### Q: 如何查看服务器日志？
A: 运行以下命令查看实时日志：
```bash
tail -f server.log
```

### Q: 如何后台运行服务器？
A: 启动脚本已经是后台运行模式，使用 `./stop.sh` 停止服务

## 手动安装依赖（可选）

如果自动安装失败，可以手动安装：

```bash
npm install
```

然后手动启动：

```bash
node server.js
```

## 技术支持

如果遇到问题，请检查：
1. Node.js 版本：`node --version`
2. npm 版本：`npm --version`
3. 端口占用：`lsof -i:3000`
4. 服务器日志：`cat server.log`
