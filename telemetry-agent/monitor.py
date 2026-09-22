"""
AI Phone & System Performance Copilot - Real Windows Telemetry Agent

Collects real-time Windows metrics using psutil every 5 seconds and posts them to the backend API.

Target Endpoint:
    POST http://localhost:4000/api/telemetry
"""

import sys
import time
import json
import base64
import urllib.request
import urllib.error

try:
    import psutil
except ImportError:
    print("[ERROR] 'psutil' is not installed. Please run: pip install psutil")
    sys.exit(1)

BACKEND_URL = "http://localhost:4000/api/telemetry"
INTERVAL_SECONDS = 5


SYSTEM_IGNORE = {
    'system', 'idle', 'registry', 'smss.exe', 'csrss.exe', 'wininit.exe',
    'services.exe', 'lsass.exe', 'svchost.exe', 'fontdrvhost.exe',
    'memory compression', 'spoolsv.exe', 'conhost.exe', 'sihost.exe',
    'taskhostw.exe', 'dwm.exe', 'searchhost.exe',
    'startmenuexperiencehost.exe', 'ctfmon.exe', 'runtimebroker.exe',
    'dllhost.exe', 'smartscreen.exe', 'securityhealthservice.exe',
    'wmi-provider-host', 'wmiprvse.exe', 'searchindexer.exe', 'audiodg.exe',
    'memcompression'
}


def collect_active_apps():
    apps = {}
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'create_time']):
            try:
                pinfo = proc.info
                pname = pinfo.get('name')
                if not pname:
                    continue
                pname_lower = pname.lower()
                if pname_lower in SYSTEM_IGNORE or pname_lower.startswith('system'):
                    continue

                mem_mb = round(pinfo['memory_info'].rss / (1024 * 1024), 1) if pinfo.get('memory_info') else 0.0
                cpu_p = round(pinfo.get('cpu_percent') or 0.0, 1)
                pid = pinfo.get('pid')

                display_name = pname
                if 'chrome' in pname_lower:
                    display_name = 'Google Chrome'
                elif 'msedge' in pname_lower:
                    display_name = 'Microsoft Edge'
                elif 'code' in pname_lower:
                    display_name = 'VS Code'
                elif 'discord' in pname_lower:
                    display_name = 'Discord'
                elif 'spotify' in pname_lower:
                    display_name = 'Spotify'
                elif 'teams' in pname_lower:
                    display_name = 'Microsoft Teams'
                elif 'python' in pname_lower:
                    display_name = 'Python'
                elif 'node' in pname_lower:
                    display_name = 'Node.js'
                elif 'antigravity' in pname_lower:
                    display_name = 'Antigravity IDE'
                elif 'explorer' in pname_lower:
                    display_name = 'File Explorer'

                key = display_name
                if key in apps:
                    apps[key]['ramMb'] = round(apps[key]['ramMb'] + mem_mb, 1)
                    apps[key]['cpuPercent'] = round(apps[key]['cpuPercent'] + cpu_p, 1)
                else:
                    apps[key] = {
                        'pid': pid,
                        'name': display_name,
                        'cpuPercent': cpu_p,
                        'ramMb': mem_mb,
                        'startTime': int(pinfo.get('create_time', 0) * 1000) if pinfo.get('create_time') else None
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception:
        pass

    top_apps = sorted(apps.values(), key=lambda x: (x['ramMb'], x['cpuPercent']), reverse=True)[:6]

    for app in top_apps:
        ram_mb = app['ramMb']
        if ram_mb >= 1024:
            app['ramFormatted'] = f"{round(ram_mb / 1024, 2)} GB"
        else:
            app['ramFormatted'] = f"{int(ram_mb)} MB"
        app['cpuFormatted'] = f"{round(app['cpuPercent'], 1)}%"

    print("\nACTIVE APPLICATIONS DETECTED:")
    for app in top_apps:
        print(f"  {app['name']} | PID={app['pid']} | CPU={app['cpuPercent']}% | RAM={app['ramMb']}MB")
    print(f"Active application count: {len(top_apps)}")

    return top_apps


def collect_installed_apps():
    installed = {}
    if sys.platform != 'win32':
        return []
    try:
        import winreg
        uninstall_keys = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_64KEY),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_32KEY),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ),
        ]

        for hive, subkey, *access in uninstall_keys:
            acc = access[0] if access else winreg.KEY_READ
            try:
                key = winreg.OpenKey(hive, subkey, 0, acc)
                num_subkeys = winreg.QueryInfoKey(key)[0]
                for i in range(num_subkeys):
                    try:
                        sub_key_name = winreg.EnumKey(key, i)
                        app_key = winreg.OpenKey(key, sub_key_name)
                        
                        def get_val(vname):
                            try:
                                return winreg.QueryValueEx(app_key, vname)[0]
                            except OSError:
                                return None

                        name = get_val("DisplayName")
                        if not name or not isinstance(name, str) or not name.strip():
                            winreg.CloseKey(app_key)
                            continue

                        sys_comp = get_val("SystemComponent")
                        parent_key = get_val("ParentKeyName")
                        release_type = get_val("ReleaseType")

                        if sys_comp == 1 or parent_key or (release_type and "update" in str(release_type).lower()):
                            winreg.CloseKey(app_key)
                            continue

                        clean_name = name.strip()
                        publisher = get_val("Publisher") or "Unknown Publisher"
                        version = get_val("DisplayVersion") or "Unavailable"
                        install_loc = get_val("InstallLocation") or "Unavailable"

                        if clean_name not in installed:
                            installed[clean_name] = {
                                "name": clean_name,
                                "publisher": str(publisher).strip(),
                                "version": str(version).strip(),
                                "installLocation": str(install_loc).strip(),
                            }
                        winreg.CloseKey(app_key)
                    except OSError:
                        pass
                winreg.CloseKey(key)
            except OSError:
                pass
    except Exception:
        pass

    return sorted(list(installed.values()), key=lambda x: x["name"].lower())


_last_net_counters = None
_last_net_time = None


_WIN_PS_METRICS_CODE = r'''
$gpuSum = 0
try {
    $engines = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue | Where-Object { $_.UtilizationPercentage -gt 0 }
    if ($engines) {
        foreach ($e in $engines) {
            $gpuSum += $e.UtilizationPercentage
        }
    }
} catch {}

$vramUsed = 0
try {
    $mems = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory -ErrorAction SilentlyContinue | Where-Object { $_.TotalCommitted -gt 0 } | Sort-Object TotalCommitted -Descending
    if ($mems) {
        $topMem = $mems[0]
        $vramUsed = [math]::Round($topMem.TotalCommitted / 1MB, 1)
    }
} catch {}

$vramTotal = 2048
try {
    $vid = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($vid -and $vid.AdapterRAM -and $vid.AdapterRAM -gt 0) {
        $vramTotal = [math]::Round($vid.AdapterRAM / 1MB, 1)
    }
} catch {}

$tempC = $null
try {
    $tz = Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction SilentlyContinue | Where-Object { $_.HighPrecisionTemperature -gt 0 } | Select-Object -First 1
    if ($tz -and $tz.HighPrecisionTemperature) {
        $tempC = [math]::Round(($tz.HighPrecisionTemperature / 10.0) - 273.15, 1)
    }
} catch {}

if ($tempC -eq $null) {
    try {
        $acpi = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Where-Object { $_.CurrentTemperature -gt 0 } | Select-Object -First 1
        if ($acpi -and $acpi.CurrentTemperature) {
            $tempC = [math]::Round(($acpi.CurrentTemperature / 10.0) - 273.15, 1)
        }
    } catch {}
}

$gpuUtil = [math]::Min(100, $gpuSum)

[PSCustomObject]@{
    gpuUtil = [double]$gpuUtil
    vramTotalMb = [double]$vramTotal
    vramUsedMb = [double]$vramUsed
    tempC = if ($tempC -ne $null) { [double]$tempC } else { $null }
} | ConvertTo-Json
'''
_WIN_PS_ENCODED = base64.b64encode(_WIN_PS_METRICS_CODE.encode('utf-16le')).decode('ascii')


def collect_win_gpu_and_thermal():
    if sys.platform != 'win32':
        return None
    try:
        import subprocess
        res = subprocess.run(
            ['powershell', '-NoProfile', '-EncodedCommand', _WIN_PS_ENCODED],
            capture_output=True, text=True, timeout=3
        )
        if res.returncode == 0 and res.stdout.strip():
            return json.loads(res.stdout.strip())
    except Exception:
        pass
    return None


def collect_gpu_metrics():
    gpu_util = None
    vram_total_mb = None
    vram_used_mb = None
    gpu_temp = None

    # 1. Try nvidia-smi CLI for NVIDIA GPUs
    try:
        import subprocess
        res = subprocess.run(
            ['nvidia-smi', '--query-gpu=utilization.gpu,memory.total,memory.used,temperature.gpu', '--format=csv,noheader,nounits'],
            capture_output=True, text=True, timeout=1
        )
        if res.returncode == 0 and res.stdout.strip():
            parts = [p.strip() for p in res.stdout.strip().split(',')]
            if len(parts) >= 4:
                gpu_util = round(float(parts[0]), 1)
                vram_total_mb = round(float(parts[1]), 1)
                vram_used_mb = round(float(parts[2]), 1)
                gpu_temp = round(float(parts[3]), 1)
                return gpu_util, vram_total_mb, vram_used_mb, gpu_temp
    except Exception:
        pass

    # 2. Fall back to Windows WMI / Performance Counters (Intel, AMD, Generic Windows GPU)
    win_data = collect_win_gpu_and_thermal()
    if win_data:
        gpu_util = round(float(win_data.get('gpuUtil', 0)), 1)
        vram_total_mb = round(float(win_data.get('vramTotalMb', 2048)), 1)
        vram_used_mb = round(float(win_data.get('vramUsedMb', 0)), 1)
        if win_data.get('tempC') is not None:
            gpu_temp = round(float(win_data['tempC']), 1)

    return gpu_util, vram_total_mb, vram_used_mb, gpu_temp


def collect_network_metrics():
    global _last_net_counters, _last_net_time
    import subprocess
    import socket
    import re

    latency_ms = None
    packet_loss_percent = None
    download_kbps = None
    upload_kbps = None

    # 1. Fast socket connection latency to 8.8.8.8:53
    try:
        t0 = time.time()
        s = socket.create_connection(('8.8.8.8', 53), timeout=1)
        latency_ms = round((time.time() - t0) * 1000, 1)
        s.close()
        packet_loss_percent = 0.0
    except Exception:
        # Fall back to ICMP ping subprocess
        try:
            res = subprocess.run(
                ['ping', '-n', '1', '-w', '800', '8.8.8.8'],
                capture_output=True, text=True, timeout=1.5
            )
            if res.returncode == 0 and res.stdout:
                match = re.search(r'time[=<](\d+)ms', res.stdout, re.IGNORECASE)
                if match:
                    latency_ms = round(float(match.group(1)), 1)
                if '0% loss' in res.stdout or '(0% loss)' in res.stdout:
                    packet_loss_percent = 0.0
                elif '100% loss' in res.stdout:
                    packet_loss_percent = 100.0
        except Exception:
            pass

    # 2. Real throughput delta via psutil
    try:
        now = time.time()
        counters = psutil.net_io_counters()
        if _last_net_counters is not None and _last_net_time is not None:
            dt = now - _last_net_time
            if dt > 0:
                bytes_recv = counters.bytes_recv - _last_net_counters.bytes_recv
                bytes_sent = counters.bytes_sent - _last_net_counters.bytes_sent
                download_kbps = round((max(0, bytes_recv) / 1024) / dt, 1)
                upload_kbps = round((max(0, bytes_sent) / 1024) / dt, 1)
        _last_net_counters = counters
        _last_net_time = now
    except Exception:
        pass

    return latency_ms, packet_loss_percent, download_kbps, upload_kbps


def collect_telemetry():
    # 1. CPU Usage % (actual measurement over 1 second interval)
    cpu_percent = psutil.cpu_percent(interval=1)

    # 2. RAM (Memory) Metrics
    mem = psutil.virtual_memory()
    ram_total_gb = round(mem.total / (1024 ** 3), 2)
    ram_used_gb = round(mem.used / (1024 ** 3), 2)
    ram_available_gb = round(mem.available / (1024 ** 3), 2)
    ram_percent = round(mem.percent, 1)

    # 3. Storage (C: Drive) Metrics
    try:
        disk = psutil.disk_usage('C:\\')
        storage_total_gb = round(disk.total / (1024 ** 3), 2)
        storage_used_gb = round(disk.used / (1024 ** 3), 2)
        storage_available_gb = round(disk.free / (1024 ** 3), 2)
        storage_percent = round(disk.percent, 1)
    except Exception:
        storage_total_gb = None
        storage_used_gb = None
        storage_available_gb = None
        storage_percent = None

    # 4. Battery & Charging Status
    battery_info = psutil.sensors_battery()
    charging_status = None
    battery_time_remaining = None
    if battery_info is not None:
        battery_level = round(battery_info.percent, 1)
        charging = bool(battery_info.power_plugged)
        if charging:
            charging_status = "Charging" if battery_level < 99 else "Full / Plugged"
        else:
            charging_status = "Discharging"
        if battery_info.secsleft > 0:
            battery_time_remaining = round(battery_info.secsleft / 60)
    else:
        battery_level = None
        charging = None

    # 5. Temperature (°C) - Only reported if a real OS thermal sensor is available
    temperature = None
    gpu_temp = None
    if hasattr(psutil, "sensors_temperatures"):
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for sensor_name, entries in temps.items():
                    if entries:
                        for entry in entries:
                            if hasattr(entry, "current") and entry.current is not None and entry.current > 0:
                                temperature = round(entry.current, 1)
                                break
                        if temperature is not None:
                            break
        except Exception:
            pass

    # 6. GPU Telemetry
    gpu_util, vram_total_mb, vram_used_mb, gpu_t = collect_gpu_metrics()
    if gpu_t is not None:
        gpu_temp = gpu_t
    if temperature is None and gpu_temp is not None:
        temperature = gpu_temp

    # 7. Network Telemetry
    latency_ms, packet_loss, download_kbps, upload_kbps = collect_network_metrics()

    # 8. Active Applications
    active_apps = collect_active_apps()

    # 9. Installed Applications (scanned from Windows Registry)
    installed_apps = collect_installed_apps()

    now_ms = int(time.time() * 1000)

    return {
        "source": "Windows Laptop",
        "platform": "Windows Laptop",
        "timestamp": now_ms,
        "cpuUsage": round(cpu_percent, 1),
        "cpu_percent": round(cpu_percent, 1),
        "ramTotal": ram_total_gb,
        "ramUsed": ram_used_gb,
        "ramAvailable": ram_available_gb,
        "ram_percent": ram_percent,
        "gpuUsage": gpu_util,
        "gpuVramTotal": vram_total_mb,
        "gpuVramUsed": vram_used_mb,
        "gpuTemp": gpu_temp,
        "storageTotal": storage_total_gb,
        "storageUsed": storage_used_gb,
        "storageAvailable": storage_available_gb,
        "storage_percent": storage_percent,
        "battery": battery_level,
        "charging": charging,
        "chargingStatus": charging_status,
        "batteryTimeRemainingMinutes": battery_time_remaining,
        "temperature": temperature,
        "cpuTemp": temperature,
        "networkLatencyMs": latency_ms,
        "packetLossPercent": packet_loss,
        "downloadKbps": download_kbps,
        "uploadKbps": upload_kbps,
        "activeApps": active_apps,
        "active_apps": active_apps,
        "activeApplications": active_apps,
        "installedApps": installed_apps,
        "installed_apps": installed_apps,
    }


def send_to_backend(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        BACKEND_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status in (200, 201):
                return True, f"HTTP {response.status}"
    except urllib.error.URLError as err:
        return False, f"Connection failed ({err.reason})"
    except Exception as err:
        return False, str(err)
    return False, "Unknown status"


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    print("==================================================")
    print(" [AGENT] AI Phone Copilot - Real Windows Laptop Telemetry Agent")
    print("==================================================")
    print(f"Target: {BACKEND_URL}")
    print(f"Polling Interval: {INTERVAL_SECONDS}s\n")

    while True:
        try:
            data = collect_telemetry()
            print(f"Telemetry activeApplications: {json.dumps(data['activeApplications'])}")
            ok, status_msg = send_to_backend(data)
            status_icon = "[SUCCESS]" if ok else "[FAIL]"
            time_str = time.strftime("%H:%M:%S")

            bat_str = f"{data['battery']}%" if data['battery'] is not None else "Unavailable"
            storage_str = f"{data['storage_percent']}% ({data['storageAvailable']} GB free)" if data['storageAvailable'] is not None else "Unavailable"
            charging_str = str(data['charging']).lower() if data['charging'] is not None else "Unavailable"

            print("--------------------------------------------------")
            print(f"LIVE LAPTOP TELEMETRY [{status_icon} | {time_str}]")
            print(f"CPU: {data['cpuUsage']}%")
            print(f"RAM: {data['ram_percent']}% ({data['ramUsed']}/{data['ramTotal']} GB)")
            print(f"GPU: {data['gpuUsage']}% | VRAM: {data['gpuVramUsed']}/{data['gpuVramTotal']} MB | Temp: {data['gpuTemp']} deg C")
            print(f"TEMP: {data['temperature']} deg C")
            print(f"STORAGE: {storage_str}")
            print(f"BATTERY: {bat_str}")
            print(f"CHARGING: {charging_str}")
            print(f"TIMESTAMP: {data['timestamp']}")
            print("--------------------------------------------------")

            time.sleep(INTERVAL_SECONDS)
        except KeyboardInterrupt:
            print("\n[INFO] Agent stopped by user.")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] {e}")
            time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
