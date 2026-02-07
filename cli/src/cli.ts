#!/usr/bin/env node
/**
 * Phone Link CLI - AI Call Handler
 * 
 * 命令行版本的 Phone Link AI 助手
 * 通过 VB-Audio Virtual Cable 连接 Windows Phone Link
 */

import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { PhoneAssistant } from './phone-assistant';
import { printDevices, findVBCableDevices } from './list-devices';

// Load environment variables
dotenv.config();

const VERSION = '1.0.0';

class PhoneLinkCLI {
    private phoneAssistant: PhoneAssistant | null = null;
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start() {
        this.printBanner();
        await this.checkPrerequisites();
        this.showHelp();
        this.startPrompt();
    }

    private printBanner() {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     📱 Phone Link AI Assistant         ║');
        console.log(`║              v${VERSION}                    ║`);
        console.log('╚════════════════════════════════════════╝\n');
    }

    private async checkPrerequisites(): Promise<boolean> {
        console.log('🔍 检查系统状态...\n');

        // Check API Key
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            console.log('  ✅ API Key 已设置');
        } else {
            console.log('  ❌ API Key 未设置 (请在 .env 文件中设置 API_KEY)');
            return false;
        }

        // Check VB-Cable
        const vbCable = findVBCableDevices();
        if (vbCable.readDeviceId !== null && vbCable.writeDeviceId !== null) {
            console.log(`  ✅ VB-Cable 就绪`);
            console.log(`     - 读取设备 (CABLE Output): Device ${vbCable.readDeviceId}`);
            console.log(`     - 写入设备 (CABLE Input): Device ${vbCable.writeDeviceId}`);
        } else {
            console.log('  ❌ VB-Cable 未检测到');
            console.log('     请安装 VB-Audio Virtual Cable: https://vb-audio.com/Cable/');
            return false;
        }

        console.log('');
        return true;
    }

    private showHelp() {
        console.log('📖 命令:');
        console.log('  start [指令]  - 开始接听电话 (可选：自定义AI指令)');
        console.log('  stop          - 结束通话');
        console.log('  say <文本>    - 让AI说指定内容');
        console.log('  devices       - 列出所有音频设备');
        console.log('  status        - 显示当前状态');
        console.log('  help          - 显示此帮助');
        console.log('  exit          - 退出程序');
        console.log('');
    }

    private startPrompt() {
        this.rl.question('> ', async (input) => {
            await this.handleCommand(input.trim());
            this.startPrompt();
        });
    }

    private async handleCommand(input: string) {
        const [command, ...args] = input.split(' ');
        const argText = args.join(' ');

        switch (command.toLowerCase()) {
            case 'start':
                await this.startCall(argText || undefined);
                break;

            case 'stop':
                this.stopCall();
                break;

            case 'say':
                if (argText) {
                    this.sendCommand(argText);
                } else {
                    console.log('用法: say <要说的内容>');
                }
                break;

            case 'devices':
                printDevices();
                break;

            case 'status':
                this.showStatus();
                break;

            case 'help':
                this.showHelp();
                break;

            case 'exit':
            case 'quit':
                this.exit();
                break;

            case '':
                // Empty input, do nothing
                break;

            default:
                console.log(`未知命令: ${command}. 输入 'help' 查看可用命令.`);
        }
    }

    private async startCall(instruction?: string) {
        if (this.phoneAssistant?.callActive) {
            console.log('⚠️  通话已在进行中');
            return;
        }

        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.log('❌ API Key 未设置');
            return;
        }

        console.log('📞 正在启动通话...');

        try {
            this.phoneAssistant = new PhoneAssistant({
                apiKey,
                voice: 'Zephyr',
                customInstruction: instruction
            });

            this.phoneAssistant.on('call-started', () => {
                console.log('✅ 通话已开始 - AI 正在监听');
            });

            this.phoneAssistant.on('call-ended', () => {
                console.log('📴 通话已结束');
            });

            this.phoneAssistant.on('ai-speaking', () => {
                process.stdout.write('🎤 ');
            });

            this.phoneAssistant.on('ai-silent', () => {
                process.stdout.write('🔇 ');
            });

            this.phoneAssistant.on('error', (err) => {
                console.log(`❌ 错误: ${err.message}`);
            });

            await this.phoneAssistant.startCall();
        } catch (error: any) {
            console.log(`❌ 启动失败: ${error.message}`);
        }
    }

    private stopCall() {
        if (!this.phoneAssistant?.callActive) {
            console.log('⚠️  当前没有进行中的通话');
            return;
        }

        this.phoneAssistant.endCall();
        this.phoneAssistant = null;
        console.log('📴 通话已结束');
    }

    private sendCommand(text: string) {
        if (!this.phoneAssistant?.callActive) {
            console.log('⚠️  当前没有进行中的通话');
            return;
        }

        this.phoneAssistant.sendCommand(text);
        console.log(`📨 已发送: "${text}"`);
    }

    private showStatus() {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        const vbCable = findVBCableDevices();

        console.log('\n📊 状态:');
        console.log(`  API Key: ${apiKey ? '✅ 已设置' : '❌ 未设置'}`);
        console.log(`  VB-Cable: ${(vbCable.readDeviceId !== null && vbCable.writeDeviceId !== null) ? '✅ 就绪' : '❌ 未检测到'}`);
        console.log(`  通话状态: ${this.phoneAssistant?.callActive ? '✅ 进行中' : '⏸️  未开始'}`);
        console.log('');
    }

    private exit() {
        if (this.phoneAssistant?.callActive) {
            this.phoneAssistant.endCall();
        }
        console.log('👋 再见!');
        this.rl.close();
        process.exit(0);
    }
}

// Run CLI
const cli = new PhoneLinkCLI();
cli.start().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
});
