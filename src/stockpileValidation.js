export function classifyCalculationValidation({
  density,
  sectionSpacing,
  maxLengthForSelectedCoal,
  maxWidthForSelectedCoal,
  blocks,
  formatNumber,
}) {
  const blockingErrors = [];
  const nonBlockingWarnings = [];

  if (density <= 0) {
    blockingErrors.push(
      "Tỷ khối phải lớn hơn 0. Kiểm tra danh mục tỷ khối hoặc nhập thủ công."
    );
  }

  if (sectionSpacing <= 0) {
    blockingErrors.push("Khoảng cách mặt cắt phải lớn hơn 0.");
  }

  blocks.forEach((block, index) => {
    const name = `Khối ${index + 1}`;

    if (block.length <= 0) blockingErrors.push(`${name}: chiều dài phải lớn hơn 0.`);
    if (block.baseWidth <= 0) {
      blockingErrors.push(`${name}: chiều rộng chân phải lớn hơn 0.`);
    }

    if (maxWidthForSelectedCoal > 0 && block.baseWidth > maxWidthForSelectedCoal) {
      nonBlockingWarnings.push(
        `${name}: chiều rộng chân không được lớn hơn ${formatNumber(maxWidthForSelectedCoal)} m.`
      );
    }

    if (block.topWidth < 0) {
      blockingErrors.push(`${name}: chiều rộng đỉnh không được âm.`);
    }

    if (block.topWidth > block.baseWidth) {
      blockingErrors.push(
        `${name}: chiều rộng đỉnh không được lớn hơn chiều rộng chân.`
      );
    }

    if (block.height <= 0) blockingErrors.push(`${name}: chiều cao phải lớn hơn 0.`);

    if (maxLengthForSelectedCoal > 0 && block.length > maxLengthForSelectedCoal) {
      nonBlockingWarnings.push(
        `${name}: chiều dài không nên lớn hơn chiều dài kho ${formatNumber(maxLengthForSelectedCoal)} m.`
      );
    }
  });

  return { blockingErrors, nonBlockingWarnings };
}

export function buildSaveMetadata(nonBlockingWarnings = []) {
  const warnings = Array.isArray(nonBlockingWarnings) ? nonBlockingWarnings : [];

  if (warnings.length > 0) {
    return {
      saveStatus: "limit_exceeded",
      saveStatusLabel: "Vượt giới hạn",
      nonBlockingWarnings: warnings,
    };
  }

  return {
    saveStatus: "valid",
    saveStatusLabel: "Hợp lệ",
    nonBlockingWarnings: [],
  };
}

export function normalizeSavedHistoryRecord(item = {}) {
  const metadata = buildSaveMetadata(item.nonBlockingWarnings);

  return {
    ...item,
    saveStatus: item.saveStatus || metadata.saveStatus,
    saveStatusLabel: item.saveStatusLabel || metadata.saveStatusLabel,
    nonBlockingWarnings: Array.isArray(item.nonBlockingWarnings)
      ? item.nonBlockingWarnings
      : metadata.nonBlockingWarnings,
    blockingErrors: Array.isArray(item.blockingErrors) ? item.blockingErrors : [],
  };
}

export function warningReasonsText(item = {}) {
  const normalized = normalizeSavedHistoryRecord(item);
  return normalized.nonBlockingWarnings.join("; ");
}
