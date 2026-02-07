#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { GeminiSession } from './gemini-session';

dotenv.config();

async function diagnostic() {
    console.log('--- Gemini Diagnostic ---');
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) { throw new Error('No API Key'); }

    const session = new GeminiSession({
        apiKey,
        voice: 'Zephyr',
        customInstruction: '你是一个助手。请现在就说“你好，我是辅助系统，我已上线。”'
    });

    session.on('connected', () => console.log('DEBUG: Connected event fired'));
    session.on('audio-response', (buf) => console.log(`DEBUG: Received audio chunk: ${buf.length} bytes`));
    session.on('error', (err) => console.log(`DEBUG: Error event: ${err.message}`));
    session.on('disconnected', () => console.log('DEBUG: Disconnected event fired'));

    console.log('Starting connection...');
    try {
        await session.connect();
        console.log('Connection promise resolved.');

        // 发送一个指令触发 AI 说话
        console.log('Sending initial command...');
        session.sendCommand('你好，请做个自我介绍');

        // Keep alive for 30 seconds
        console.log('Waiting for AI response (30s)...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('Closing session...');
        session.disconnect();
    } catch (e: any) {
        console.error('FAILED:', e.message);
    }
}

diagnostic();
