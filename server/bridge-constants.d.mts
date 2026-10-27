/** @see bridge-constants.mjs */
export function getWorkbenchHttpPort(): number;
export function getWorkbenchUiPort(): number;
export function getWorkbenchWsPort(): number;
export function getBridgeHealthUrl(host?: string): string;
export function getBridgeRpcUrl(host?: string): string;
export function getBridgeWsUrl(host?: string): string;
export function getUiProxyRpcUrl(host?: string): string;
export function getWorkbenchBrowserProxyPublicPath(): string;
