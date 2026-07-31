export function canShareFile(navigatorObject, file) {
  if (
    typeof navigatorObject?.share !== "function" ||
    typeof navigatorObject?.canShare !== "function"
  ) {
    return false;
  }

  try {
    return navigatorObject.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function prefersNativeFileSave(windowObject) {
  return Boolean(windowObject?.matchMedia?.("(pointer: coarse)")?.matches);
}

export function downloadFile(
  file,
  {
    documentObject = globalThis.document,
    urlObject = globalThis.URL,
    setTimeoutFunction = globalThis.setTimeout,
  } = {}
) {
  const downloadBlob = new Blob([file], {
    type: "application/octet-stream",
  });
  const url = urlObject.createObjectURL(downloadBlob);
  const link = documentObject.createElement("a");

  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  documentObject.body.appendChild(link);
  link.click();
  link.remove();

  setTimeoutFunction(() => urlObject.revokeObjectURL(url), 60_000);
}

export async function deliverFile({
  file,
  intent,
  navigatorObject,
  windowObject,
  download,
}) {
  const shouldShare =
    intent === "share" ||
    (intent === "save" && prefersNativeFileSave(windowObject));

  if (!shouldShare || !canShareFile(navigatorObject, file)) {
    download(file);
    return "downloaded";
  }

  try {
    await navigatorObject.share({
      files: [file],
      title: file.name,
    });
    return "shared";
  } catch (error) {
    if (error?.name === "AbortError") {
      return "share-aborted";
    }

    download(file);
    return "downloaded";
  }
}
