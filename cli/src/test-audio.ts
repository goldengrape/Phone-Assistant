#!/usr/bin/env node
/**
 * Audio Loopback Test
 * 
 * 测试：从 VB-Cable Output 读取音频，直接写入 VB-Cable Input
 * 可选：同时输出到真实扬声器用于监听
 * 
 * 用法：
 * 1. 在 Windows 声音设置中:
 *    - 打开 设置 → 系统 → 声音 → 高级声音选项 → 应用音量和设备首选项
 *    - 为 Phone Link 设置:
 *      - 输出 → CABLE Input
 *      - 输入 → CABLE Output
 * 2. 运行此脚本
 * 3. 发起测试电话，应能听到回声
 */

import * as dotenv from 'dotenv';
import { findVBCableDevices, listDevices } from './list-devices';

dotenv.config();

// Lazy load naudiodon
let portAudio: typeof import('naudiodon') | null = null;
function getPortAudio(): typeof import('naudiodon') {
    if (!portAudio) {
        portAudio = require('naudiodon');
    }
    return portAudio!;
}

async function runLoopbackTest() {
    console.log('\n🔊 Audio Loopback Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check VB-Cable
    const vbCable = findVBCableDevices();
    if (vbCable.readDeviceId === null || vbCable.writeDeviceId === null) {
        console.log('❌ VB-Cable 未检测到');
        process.exit(1);
    }

    // Find real speakers (Device 5 is usually Realtek Speakers)
    const devices = listDevices();
    const realtekSpeaker = devices.find(d =>
        d.name.includes('Realtek') &&
        d.name.includes('Speakers') &&
        d.maxOutputChannels > 0
    );

    console.log(`📥 读取: Device ${vbCable.readDeviceId} (CABLE Output - Phone 音频)`);
    console.log(`📤 写入: Device ${vbCable.writeDeviceId} (CABLE Input - 发送给 Phone)`);
    if (realtekSpeaker) {
        console.log(`🔈 监听: Device ${realtekSpeaker.id} (${realtekSpeaker.name})`);
    }
    console.log('');
    console.log('ℹ️  请按以下步骤设置 Phone Link 音频:');
    console.log('   1. 打开 设置 → 系统 → 声音');
    console.log('   2. 点击 "高级声音选项" 或 "音量混合器"');
    console.log('   3. 找到 Phone Link，设置:');
    console.log('      - 输出 → CABLE Input');
    console.log('      - 输入 → CABLE Output');
    console.log('');
    console.log('按 Ctrl+C 停止测试\n');

    const pa = getPortAudio();

    // Create input stream (read from CABLE Output)
    const inputStream = pa.AudioIO({
        inOptions: {
            channelCount: 1,
            sampleFormat: pa.SampleFormat16Bit,
            sampleRate: 16000,
            deviceId: vbCable.readDeviceId!,
            closeOnError: false
        }
    });

    // Create output stream (write to CABLE Input)
    const outputStream = pa.AudioIO({
        outOptions: {
            channelCount: 1,
            sampleFormat: pa.SampleFormat16Bit,
            sampleRate: 16000,
            deviceId: vbCable.writeDeviceId!,
            closeOnError: false
        }
    });

    // Optional: Create monitor stream to real speakers
    let monitorStream: any = null;
    if (realtekSpeaker) {
        try {
            monitorStream = pa.AudioIO({
                outOptions: {
                    channelCount: 1,
                    sampleFormat: pa.SampleFormat16Bit,
                    sampleRate: 16000,
                    deviceId: realtekSpeaker.id,
                    closeOnError: false
                }
            });
        } catch (e) {
            console.log('⚠️  无法创建监听输出');
        }
    }

    // Loopback: route audio from input to output(s)
    inputStream.on('data', (buffer: Buffer) => {
        outputStream.write(buffer);
        if (monitorStream) {
            monitorStream.write(buffer);
        }
        process.stdout.write('.');  // Show activity
    });

    inputStream.on('error', (err: Error) => {
        console.error('❌ 输入错误:', err.message);
    });

    outputStream.on('error', (err: Error) => {
        console.error('❌ 输出错误:', err.message);
    });

    // Start streams
    inputStream.start();
    outputStream.start();
    if (monitorStream) {
        monitorStream.start();
    }

    console.log('✅ 音频回环已启动\n');

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n📴 停止音频回环...');
        inputStream.quit();
        outputStream.quit();
        if (monitorStream) {
            monitorStream.quit();
        }
        process.exit(0);
    });
}

runLoopbackTest().catch(console.error);
