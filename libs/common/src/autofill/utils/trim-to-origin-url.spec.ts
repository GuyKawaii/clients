import { trimToOriginUrl } from "./trim-to-origin-url";

describe("trimToOriginUrl", () => {
  it.each([
    ["https://sub.domain.com:8080/login?auth=token#hash", "https://sub.domain.com:8080"],
    ["https://tenant.slack.com/login", "https://tenant.slack.com"],
    ["http://192.168.1.100:8080/login", "http://192.168.1.100:8080"],
    ["http://[2001:db8::1]:8080/login?token=secret", "http://[2001:db8::1]:8080"],
    ["http://localhost:3000/", "http://localhost:3000"],
    ["https://example.com", "https://example.com"],
    ["https://example.com/", "https://example.com"],
    ["https://example.com?token=secret", "https://example.com"],
    ["https://example.com#secret", "https://example.com"],
    ["https://user:password@example.com/login", "https://example.com"],
    ["https://example.com:443/login", "https://example.com"],
    ["http://example.com:80/login", "http://example.com"],
    ["HTTPS://EXAMPLE.COM/login", "https://example.com"],
    ["https://münich.example/login", "https://xn--mnich-kva.example"],
  ])("transforms %s to %s", (uri, expected) => {
    expect(trimToOriginUrl(uri)).toBe(expected);
  });

  it.each([
    "androidapp://com.example/login?token=secret#hash",
    "iosapp://example/login",
    "ftp://example.com/path",
    "file:///tmp/example",
    "javascript:alert(1)",
    "mailto:user@example.com",
    "example.com/login",
    "/relative/path",
    "//example.com/path",
    "https://",
    "https://example.com:invalid/login",
    "not a URL",
    "",
  ])("preserves non-HTTP(S) or invalid input: %s", (uri) => {
    expect(trimToOriginUrl(uri)).toBe(uri);
  });
});
