import pyaudio

def main():
    pa = pyaudio.PyAudio()
    info = pa.get_host_api_info_by_index(0)
    numdevices = info.get('deviceCount')

    print("--- Available Audio Devices ---")
    
    # List input devices
    print("\n[Input Devices]")
    for i in range(0, numdevices):
        if (pa.get_device_info_by_host_api_device_index(0, i).get('maxInputChannels')) > 0:
            name = pa.get_device_info_by_host_api_device_index(0, i).get('name')
            print(f"Device ID {i} - {name}")

    # List output devices
    print("\n[Output Devices]")
    for i in range(0, numdevices):
        if (pa.get_device_info_by_host_api_device_index(0, i).get('maxOutputChannels')) > 0:
            name = pa.get_device_info_by_host_api_device_index(0, i).get('name')
            print(f"Device ID {i} - {name}")

    print("\n")
    pa.terminate()

if __name__ == '__main__':
    main()
