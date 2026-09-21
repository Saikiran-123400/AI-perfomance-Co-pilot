import type { TelemetrySample, TelemetrySource } from '../types';

/** Idle values the device settles back toward. */
const BASELINE = { cpu: 30, ram: 55, storage: 64, temperature: 31 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10) / 10;

/** Move `value` a fraction of the way home, then add noise. */
const revert = (value: number, target: number, pull: number, noise: number) =>
  value + (target - value) * pull + (Math.random() - 0.5) * noise;

/**
 * Fake device telemetry with inertia and mean reversion, so the chart looks
 * like a phone rather than noise.
 */
export const simulatedTelemetrySource: TelemetrySource = {
  name: 'simulator',

  read(previous?: TelemetrySample): TelemetrySample {
    const base: TelemetrySample = previous ?? {
      timestamp: Date.now(),
      cpuUsage: BASELINE.cpu,
      ramUsage: BASELINE.ram,
      storageUsage: BASELINE.storage,
      temperature: BASELINE.temperature,
      batteryLevel: 82,
      batteryDrainRate: 8,
    };

    // Occasional load spike, the way a background app would behave.
    const spike = Math.random() < 0.12 ? 20 + Math.random() * 25 : 0;

    const cpuUsage = clamp(revert(base.cpuUsage, BASELINE.cpu, 0.3, 16) + spike, 3, 100);
    const ramUsage = clamp(
      revert(base.ramUsage, BASELINE.ram, 0.15, 6) + spike * 0.25,
      20,
      98
    );
    const storageUsage = clamp(
      revert(base.storageUsage ?? BASELINE.storage, BASELINE.storage, 0.05, 0.5),
      10,
      95
    );

    // Heat follows CPU, and bleeds back toward ambient when the load drops.
    const baseTemp = base.temperature ?? BASELINE.temperature;
    const heating = (cpuUsage / 100) * 1.8;
    const cooling = (baseTemp - BASELINE.temperature) * 0.12;
    const temperature = clamp(
      baseTemp + heating - cooling - 0.5 + (Math.random() - 0.5) * 0.4,
      26,
      50
    );

    const batteryDrainRate = clamp(
      3 + cpuUsage * 0.1 + Math.max(0, temperature - 38) * 0.6,
      1,
      35
    );
    const baseBattery = base.batteryLevel ?? 82;
    const batteryLevel = clamp(baseBattery - batteryDrainRate / 60, 1, 100);

    return {
      timestamp: Date.now(),
      cpuUsage: round(cpuUsage),
      ramUsage: round(ramUsage),
      storageUsage: round(storageUsage),
      temperature: round(temperature),
      batteryLevel: round(batteryLevel),
      batteryDrainRate: round(batteryDrainRate),
    };
  },
};
