export type KitchenSlaStatus = 'ON_TIME' | 'AT_RISK' | 'DELAYED';

export function kitchenSlaStatus(
  estimatedMinutes: number,
  actualMinutes: number,
): KitchenSlaStatus {
  if (actualMinutes <= estimatedMinutes) return 'ON_TIME';
  if (actualMinutes <= estimatedMinutes * 1.2) return 'AT_RISK';
  return 'DELAYED';
}
