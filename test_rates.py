import pyaudio

def test_device_rates():
    pa = pyaudio.PyAudio()
    
    # 尝试测定 BlackHole 16ch (通常是 Device 2) 和 Blackhole 2ch (通常 Device 3) 的支持情况
    target_rates = [16000, 24000, 44100, 48000]
    
    info = pa.get_host_api_info_by_index(0)
    numdevices = info.get('deviceCount')
    
    print("=== Testing Supported Rates for Devices ===")
    for i in range(numdevices):
        dev_info = pa.get_device_info_by_host_api_device_index(0, i)
        name = dev_info.get('name')
        
        if "BlackHole" in name or "内置" in name or "Built-in" in name:
            max_in = dev_info.get('maxInputChannels')
            print(f"\nDevice {i} - {name} (Max Input: {max_in})")
            
            if max_in > 0:
                print("Supported Input Rates:")
                for rate in target_rates:
                    try:
                        supported = pa.is_format_supported(
                            rate,
                            input_device=i,
                            input_channels=1,
                            input_format=pyaudio.paInt16
                        )
                        if supported:
                            print(f"  - {rate} Hz: YES")
                    except ValueError:
                        print(f"  - {rate} Hz: NO")
                        
    pa.terminate()

if __name__ == '__main__':
    test_device_rates()
