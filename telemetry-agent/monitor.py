"""
AI Phone & System Performance Copilot - Real Windows Telemetry Agent

Collects real-time Windows metrics using psutil every 5 seconds and posts them to the backend API.

Target Endpoint:
    POST http://localhost:4000/api/telemetry
"""

import sys
import time
import json
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

    # 4. Battery & Charging (None/null if OS/hardware does not expose battery)
    battery_info = psutil.sensors_battery()
    if battery_info is not None:
        battery_level = round(battery_info.percent, 1)
        charging = bool(battery_info.power_plugged)
    else:
        battery_level = None
        charging = None

    # 5. Temperature (°C) - Only reported if a real OS thermal sensor is available
    temperature = None
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

    # 6. Active Applications
    active_apps = collect_active_apps()

    # 7. Installed Applications (scanned from Windows Registry)
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
        "storageTotal": storage_total_gb,
        "storageUsed": storage_used_gb,
        "storageAvailable": storage_available_gb,
        "storage_percent": storage_percent,
        "battery": battery_level,
        "charging": charging,
        "temperature": temperature,
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
    print("==================================================")
    print(" 💻 AI Phone Copilot - Real Windows Laptop Telemetry Agent")
    print("==================================================")
    print(f"Target: {BACKEND_URL}")
    print(f"Polling Interval: {INTERVAL_SECONDS}s\n")

    while True:
        try:
            data = collect_telemetry()
            print(f"Telemetry activeApplications: {json.dumps(data['activeApplications'])}")
            ok, status_msg = send_to_backend(data)
            status_icon = "✅ SUCCESS" if ok else "❌ FAIL"
            time_str = time.strftime("%H:%M:%S")

            bat_str = f"{data['battery']}%" if data['battery'] is not None else "Unavailable"
            storage_str = f"{data['storage_percent']}% ({data['storageAvailable']} GB free)" if data['storageAvailable'] is not None else "Unavailable"
            charging_str = str(data['charging']).lower() if data['charging'] is not None else "Unavailable"

            print("--------------------------------------------------")
            print(f"LIVE LAPTOP TELEMETRY [{status_icon} | {time_str}]")
            print(f"CPU: {data['cpuUsage']}%")
            print(f"RAM: {data['ram_percent']}% ({data['ramUsed']}/{data['ramTotal']} GB)")
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
