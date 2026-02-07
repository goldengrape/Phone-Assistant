#!/usr/bin/env node
/**
 * Gemini Live API Connection Test
 * 
 * 测试：连接 Gemini Live API 并发送/接收简单的音频指令
 */

import * as dotenv from 'dotenv';
import { GeminiSession } from './gemini-session';

dotenv.config();

async function runGeminiTest() {
    console.log('\n🌟 Gemini Live API Connection Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ API Key 未设置');
        process.exit(1);
    }

    console.log('🔗 正在连接 Gemini Live API...');

    const session = new GeminiSession({
        apiKey,
        voice: 'Zephyr',
        customInstruction: '你是一个电话助手。请简短地回答“你好，连接测试成功”，然后保持沉默。'
    });

    session.on('connected', () => {
        console.log('✅ 已连接成功');
    });

    session.on('audio-response', (pcmBuffer) => {
        console.log(`🎤 收到 AI 音频: ${pcmBuffer.length} bytes`);
        // We don't play it here, just verify we receive it
    });

    session.on('error', (err) => {
        console.error('❌ 错误:', err.message);
    });

    session.on('disconnected', () => {
        console.log('🚪 连接已关闭');
        process.exit(0);
    });

    try {
        await session.connect();
        console.log('🚀 会话已启动');

        // 发送一个命令触发回复
        setTimeout(() => {
            console.log('📨 发送测试指令...');
            session.sendCommand('你好，请做个自我介绍');
        }, 2000);

        // Wait a bit to receive the greeting
        setTimeout(() => {
            console.log('\n✅ 测试完成');
            session.disconnect();
        }, 15000);

    } catch (error: any) {
        console.error('❌ 连接失败:', error.message);
        process.exit(1);
    }
}

runGeminiTest().catch(console.error);
