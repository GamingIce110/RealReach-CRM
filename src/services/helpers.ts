export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
