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

export function findVBCableDevices(): { inputId: number | null; outputId: number | null } {
    const devices = listAudioDevices();

    // CABLE Output = what we read FROM (phone's audio comes here)
    // CABLE Input = what we write TO (AI's voice goes here, phone hears it)
    const cableOutput = devices.find(d =>
        d.name.includes("CABLE Output") && d.maxInputChannels > 0
    );
    const cableInput = devices.find(d =>
        d.name.includes("CABLE Input") && d.maxOutputChannels > 0
    );

    return {
        inputId: cableOutput?.id ?? null,  // We READ from CABLE Output
        outputId: cableInput?.id ?? null   // We WRITE to CABLE Input
    };
}

export function printDevices(): void {
    console.log("\n=== Audio Devices ===\n");

    const devices = listAudioDevices();

    devices.forEach((d, i) => {
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
    console.log(`Read from (Phone audio): ${vbCable.inputId !== null ? `Device ${vbCable.inputId}` : "NOT FOUND"}`);
    console.log(`Write to (AI voice): ${vbCable.outputId !== null ? `Device ${vbCable.outputId}` : "NOT FOUND"}`);
}

// Run directly
if (require.main === module) {
    printDevices();
}
