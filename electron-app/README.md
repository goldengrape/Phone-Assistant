# Phone Link AI Assistant (Electron)

通过 Windows 11 Phone Link 让 AI 代替你接听电话。

## 功能

- 🎙️ **实时语音对话**：AI 通过 VB-Audio Virtual Cable 与电话通话
- 📝 **隐形指令**：通话过程中给 AI 发送文字指令，AI 不会读出来
- 🔊 **Gemini Live API**：使用 Google 最新的实时语音 AI

## 系统要求

1. **Windows 11** + Phone Link 应用
2. **VB-Audio Virtual Cable** (已安装)
3. **Node.js 18+**
4. **Google Gemini API Key**

## 快速开始

### 1. 配置 API Key

```powershell
cd electron-app
copy .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

### 2. 配置 Phone Link 音频路由

在 Windows 声音设置中：

1. 打开 **设置 > 系统 > 声音**
2. 找到 **Phone Link** 应用的音频设置
3. 将 Phone Link 的 **扬声器** 设为 `CABLE Input`
4. 将 Phone Link 的 **麦克风** 设为 `CABLE Output`

或者在每次接听电话时，右键点击通知区域的扬声器图标选择音频路由。

### 3. 运行应用

```powershell
cd electron-app
npm run build
npm start
```

### 4. 使用方法

1. 在手机上通过 Phone Link 拨打电话
2. 点击应用中的 **Start AI Agent**
3. AI 将自动接听并与对方对话
4. 在底部输入框发送指令给 AI（如"结束通话"、"更礼貌一点"）

## 开发

```powershell
# 列出音频设备
npm run list-devices

# 开发模式
npm run dev
```

## 故障排除

### VB-Cable 未找到
运行 `npm run list-devices` 确认设备列表中有 `CABLE Input` 和 `CABLE Output`。

### API Key 错误
确保 `.env` 文件中的 `API_KEY` 已正确设置。

### 没有声音
检查 Phone Link 的音频路由是否正确配置到 VB-Cable。
