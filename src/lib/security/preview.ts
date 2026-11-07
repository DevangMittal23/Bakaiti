import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return family === 6 && globalIPv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function previewUrl(value: string) {
  if (value.length > 2048) throw new Error("URL is too long");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("Only HTTP(S) URLs on standard ports are supported");
  }
  return url;
}

export async function resolvePublicAddress(hostname: string, resolve = lookup) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  const addresses = literal ? [{ address: host, family: literal }] : await resolve(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Destination is not a public address");
  }
  return addresses[0];
}

const MAX_HTML_BYTES = 1024 * 1024;

export async function fetchPreviewHtml(value: string) {
  const signal = AbortSignal.timeout(5000);
  const fetchPage = async () => {
    let url = previewUrl(value);
    for (let hop = 0; hop <= 3; hop++) {
      const address = await resolvePublicAddress(url.hostname);
      signal.throwIfAborted();
      const result = await new Promise<{ html?: string; location?: string }>((resolve, reject) => {
        const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
          signal,
          agent: false,
          family: address.family,
          // Pin the vetted address to the actual socket to prevent DNS rebinding.
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [address]);
            else callback(null, address.address, address.family);
          },
          headers: { Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "Bakaiti-LinkPreview/1.0" },
        }, (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
            response.destroy();
            resolve({ location: response.headers.location });
            return;
          }
          if ((response.statusCode ?? 500) >= 400 ||
              !/^(text\/html|application\/xhtml\+xml)\b/i.test(response.headers["content-type"] ?? "") ||
              (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) {
            response.destroy();
            reject(new Error("Destination must return uncompressed HTML"));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_HTML_BYTES) {
              response.destroy(new Error("Preview response is too large"));
            } else chunks.push(chunk);
          });
          response.on("error", reject);
          response.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
        });
        request.on("error", reject);
        request.end();
      });
      if (result.html !== undefined) return { html: result.html, url };
      url = previewUrl(new URL(result.location!, url).href);
    }
    throw new Error("Too many redirects");
  };
  // Bound DNS lookup time too; an aborted lookup cannot subsequently open a socket.
  return Promise.race([
    fetchPage(),
    new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Preview timed out")), { once: true })),
  ]);
}
