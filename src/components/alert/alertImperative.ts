import type { AlertImperativeApi } from "./alertContext";

let imperativeApi: AlertImperativeApi | null = null;

export function registerAlertImperativeApi(api: AlertImperativeApi | null): void {
  imperativeApi = api;
}

export function getAlertApi(): AlertImperativeApi | null {
  return imperativeApi;
}
