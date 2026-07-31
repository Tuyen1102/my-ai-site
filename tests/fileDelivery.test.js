import { describe, expect, it, vi } from "vitest";
import {
  canShareFile,
  deliverFile,
  downloadFile,
  prefersNativeFileSave,
} from "../src/fileDelivery.js";

const file = { name: "ket-qua.xlsx" };

describe("mobile file delivery", () => {
  it("uses the native share sheet when saving on a touch device", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const navigatorObject = {
      canShare: vi.fn().mockReturnValue(true),
      share,
    };
    const download = vi.fn();

    const result = await deliverFile({
      file,
      intent: "save",
      navigatorObject,
      windowObject: {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      },
      download,
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      files: [file],
      title: file.name,
    });
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads directly when native file sharing is unavailable", async () => {
    const download = vi.fn();

    const result = await deliverFile({
      file,
      intent: "share",
      navigatorObject: {},
      windowObject: {},
      download,
    });

    expect(result).toBe("downloaded");
    expect(download).toHaveBeenCalledWith(file);
  });

  it("returns an ambiguous status for AbortError without forcing a download", async () => {
    const download = vi.fn();
    const navigatorObject = {
      canShare: vi.fn().mockReturnValue(true),
      share: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("Canceled"), {
          name: "AbortError",
        })),
    };

    const result = await deliverFile({
      file,
      intent: "share",
      navigatorObject,
      windowObject: {},
      download,
    });

    expect(result).toBe("share-aborted");
    expect(download).not.toHaveBeenCalled();
  });

  it("falls back to download when native sharing fails", async () => {
    const download = vi.fn();
    const navigatorObject = {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(new Error("Share failed")),
    };

    const result = await deliverFile({
      file,
      intent: "share",
      navigatorObject,
      windowObject: {},
      download,
    });

    expect(result).toBe("downloaded");
    expect(download).toHaveBeenCalledWith(file);
  });

  it("handles capability checks that throw", () => {
    const navigatorObject = {
      canShare: vi.fn(() => {
        throw new Error("Unsupported");
      }),
      share: vi.fn(),
    };

    expect(canShareFile(navigatorObject, file)).toBe(false);
    expect(prefersNativeFileSave({})).toBe(false);
  });

  it("creates an attachment download with the Excel filename", () => {
    const link = {
      click: vi.fn(),
      remove: vi.fn(),
    };
    const documentObject = {
      body: {
        appendChild: vi.fn(),
      },
      createElement: vi.fn().mockReturnValue(link),
    };
    const urlObject = {
      createObjectURL: vi.fn().mockReturnValue("blob:excel-download"),
      revokeObjectURL: vi.fn(),
    };
    const setTimeoutFunction = vi.fn();

    downloadFile(file, {
      documentObject,
      urlObject,
      setTimeoutFunction,
    });

    const [downloadBlob] = urlObject.createObjectURL.mock.calls[0];

    expect(downloadBlob).toBeInstanceOf(Blob);
    expect(downloadBlob.type).toBe("application/octet-stream");
    expect(link.download).toBe(file.name);
    expect(link.href).toBe("blob:excel-download");
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(setTimeoutFunction).toHaveBeenCalledOnce();
  });
});
