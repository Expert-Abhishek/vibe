let dutyStatus: Record<string, boolean> = {
  driver: true,
  guide: true,
};

const listeners = new Set<() => void>();

export const dutyStatusStore = {
  setOnline(role: 'driver' | 'guide' | string, isOnline: boolean) {
    dutyStatus[role] = isOnline;
    listeners.forEach((l) => l());
  },
  isOnline(role: 'driver' | 'guide' | string): boolean {
    return dutyStatus[role] !== false;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
