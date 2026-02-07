/**
 * Audio Device Discovery - Lists all audio devices including VB-Cable
 */

// Lazy load naudiodon to avoid conflicts with Electron
let portAudio: typeof import('naudiodon') | null = null;

function getPortAudio(): typeof import('naudiodon') {
    if (!portAudio) {
        portAudio = require('naudiodon');
    }
    return portAudio!;
}

interface AudioDevice {
    id: number;
    name: string;
    maxInputChannels: number;
    maxOutputChannels: number;
    defaultSampleRate: number;
    hostAPIName: string;
}

export function listAudioDevices(): AudioDevice[] {
    const devices = getPortAudio().getDevices() as AudioDevice[];
    return devices;
}

// Alias for convenience
export const listDevices = listAudioDevices;

export function findVBCableDevices(): { readDeviceId: number | null; writeDeviceId: number | null } {
    const devices = listAudioDevices();

    // CABLE Output (e.g. Device 3) = what we READ from (phone's audio comes here)
    // CABLE Input (e.g. Device 7) = what we WRITE to (AI's voice goes here, phone hears it)
    const cableOutput = devices.find(d =>
        d.name.includes("CABLE Output") && d.maxInputChannels > 0
    );
    const cableInput = devices.find(d =>
        d.name.includes("CABLE Input") && d.maxOutputChannels > 0
    );

    return {
        readDeviceId: cableOutput?.id ?? null,
        writeDeviceId: cableInput?.id ?? null
    };
}

export function printDevices(): void {
    console.log("\n=== Audio Devices ===\n");

    const devices = listAudioDevices();

    devices.forEach((d) => {
        const type = d.maxInputChannels > 0 && d.maxOutputChannels > 0
            ? "I/O"
            : d.maxInputChannels > 0
                ? "Input"
                : "Output";

        const isVBCable = d.name.includes("CABLE") ? " ⭐ VB-CABLE" : "";

        console.log(`[${d.id}] ${d.name} (${type})${isVBCable}`);
        console.log(`    Channels: In=${d.maxInputChannels} Out=${d.maxOutputChannels}`);
        console.log(`    Sample Rate: ${d.defaultSampleRate}Hz | API: ${d.hostAPIName}`);
        console.log();
    });

    const vbCable = findVBCableDevices();
    console.log("=== VB-Cable Status ===");
    console.log(`Read from (Phone audio): ${vbCable.readDeviceId !== null ? `Device ${vbCable.readDeviceId}` : "NOT FOUND"}`);
    console.log(`Write to (AI voice): ${vbCable.writeDeviceId !== null ? `Device ${vbCable.writeDeviceId}` : "NOT FOUND"}`);
}

// Run directly
if (require.main === module) {
    printDevices();
}
