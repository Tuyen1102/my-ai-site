# Changelog

## [Unreleased]

### Changed

- Corrected TTCO source mappings for DB codes 34 (Kho 35), 35 (Kho 36), and 75 (Kho 5-T4); corrected warehouse-name handling in the website and added stock reconciliation regression tests. The rebuilt stock formula remains unchanged.
- Documented the TTCO stock reconciliation and correction plan for Kho 35 and Kho 5-T4, including missing warehouse mappings and a 1,216-ton discrepancy in outbound movements.
- Updated the bundled catalog to use "Than nguyên khai" consistently with TTCO stock data in the density list and descriptions for five warehouses, preserving all 46 warehouses and 30 density values.
- Updated the bundled coal warehouse and density catalog from the supplied workbook to include 46 warehouses and 30 density rows.

### Added

- Added editing for saved calculations so measurement inputs can be loaded back into the calculator, recalculated, and updated without creating a duplicate history row.
- Added mobile Excel file sharing through the device share sheet, including a direct-download fallback.

### Fixed

- Preserved TTCO_APP stock for Kho 26, Kho 29, and Kho 30 by accepting only their audited DB-code pairs (29→26, 26→29, 27→30); kept rejection of mismatched warehouses and technical areas.
- Kept the verified Kho 39 stock lines visible when source DB code 28 differs from the canonical warehouse number; retained the source marker and continued excluding technical ponds and zero-balance lines.
- Prevented background data refreshes or source changes from overwriting values while a saved calculation is being edited.
- Changed mobile Excel saving to offer “Save to Files” instead of requiring an installed spreadsheet application.
