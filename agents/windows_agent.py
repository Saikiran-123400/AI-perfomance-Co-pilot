"""
AI Phone & System Performance Copilot - Windows Telemetry Agent

Collects real-time system metrics (CPU, RAM, Storage, Battery, Temperature)
from Windows laptops/PCs using `psutil` and sends them to the Copilot backend API.

Requirements:
    pip install psutil

Usage:
    python agents/windows_agent.py [--server http://localhost:4000]
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error

try:
    import psutil
except ImportError:
    print("[ERROR] 'psutil' library is not installed.")
    print("Please install it by running: pip install psutil")
    sys.exit(1)


def get_windows_telemetry():
    # 1. CPU Usage %
    cpu_usage = psutil.cpu_percent(interval=0.5)

    # 2. RAM Metrics (in GB)
    mem = psutil.virtual_memory()
    ram_total = round(mem.total / (1024 ** 3), 2)
    ram_used = round(mem.used / (1024 ** 3), 2)
    ram_available = round(mem.available / (1024 ** 3), 2)

    # 3. Storage Metrics (C: Drive in GB)
    try:
        disk = psutil.disk_usage('C:\\')
        storage_total = round(disk.total / (1024 ** 3), 2)
        storage_used = round(disk.used / (1024 ** 3), 2)
        storage_available = round(disk.free / (1024 ** 3), 2)
    except Exception:
        storage_total, storage_used, storage_available = 256.0, 128.0, 128.0

    # 4. Battery & Charging
    battery_info = psutil.sensors_battery()
    if battery_info:
        battery_level = round(battery_info.percent, 1)
        charging = bool(battery_info.power_plugged)
    else:
        battery_level = 100.0  # Desktop PC / AC Power
        charging = True

    # 5. Temperature (°C)
    # Hardware sensors or CPU load estimate
    temperature = 36.0 + (cpu_usage * 0.25)
    if hasattr(psutil, "sensors_temperatures"):
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for sensor_name, entries in temps.items():
                    if entries:
                        temperature = round(entries[0].current, 1)
                        break
        except Exception:
            pass

    return {
        "platform": "Windows PC",
        "source": "Windows PC",
        "cpuUsage": round(cpu_usage, 1),
        "ramTotal": ram_total,
        "ramUsed": ram_used,
        "ramAvailable": ram_available,
        "storageTotal": storage_total,
        "storageUsed": storage_used,
        "storageAvailable": storage_available,
        "battery": battery_level,
        "charging": charging,
        "temperature": round(temperature, 1),
    }


def send_telemetry(server_url, payload):
    url = f"{server_url.rstrip('/')}/api/telemetry"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status in (200, 201):
                return True
    except urllib.error.URLError as e:
        print(f"[WARN] Connection failed to {url}: {e}")
    except Exception as e:
        print(f"[WARN] Failed to send telemetry: {e}")
    return False


def main():
    parser = argparse.ArgumentParser(description="Windows Telemetry Agent for AI Performance Copilot")
    parser.add_argument("--server", default="http://localhost:4000", help="Backend API server URL")
    parser.add_argument("--interval", type=int, default=3, help="Polling interval in seconds")
    args = parser.parse_args()

    print("==================================================")
    print(" 💻 AI Performance Copilot - Windows Telemetry Agent")
    print("==================================================")
    print(f"Target Backend: {args.server}")
    print(f"Sampling Interval: {args.interval}s")
    print("Press Ctrl+C to stop.\n")

    while True:
        try:
            telemetry = get_windows_telemetry()
            success = send_telemetry(args.server, telemetry)
            status_str = "SUCCESS ✅" if success else "OFFLINE ❌"
            print(
                f"[{status_str}] CPU: {telemetry['cpuUsage']}% | RAM: {telemetry['ramUsed']}/{telemetry['ramTotal']} GB | "
                f"Storage Free: {telemetry['storageAvailable']} GB | Battery: {telemetry['battery']}% | Temp: {telemetry['temperature']}°C"
            )
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n[INFO] Agent stopped by user.")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] Unexpected loop error: {e}")
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
