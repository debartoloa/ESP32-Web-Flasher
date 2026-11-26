import { Transport, ESPLoader } from "https://unpkg.com/esptool-js/bundle.js";

const FAMILIES = {
  esp32: {
    label: "ESP32 Classico",
    bootloaderAddress: 0x1000,
    bootloaderHex: "0x1000",
    partitionLabel: "Layout 4MB (min_spiffs): Dual OTA 1.9MB + FS",
    dir: "./firmware/esp32",
  },
  esp32s3: {
    label: "ESP32-S3",
    bootloaderAddress: 0x0000,
    bootloaderHex: "0x0000",
    partitionLabel: "Layout 8MB/16MB Dual OTA",
    dir: "./firmware/esp32s3",
  },
  esp32c3: {
    label: "ESP32-C3",
    bootloaderAddress: 0x0000,
    bootloaderHex: "0x0000",
    partitionLabel: "Layout 4MB (min_spiffs): Dual OTA 1.9MB + FS",
    dir: "./firmware/esp32c3",
  },
  esp32s2: {
    label: "ESP32-S2",
    bootloaderAddress: 0x1000,
    bootloaderHex: "0x1000",
    partitionLabel: "Layout 4MB (default): Dual OTA 1.28MB",
    dir: "./firmware/esp32s2",
  },
};

const state = {
  port: null,
  transport: null,
  esploader: null,
  chipName: null,
  family: "esp32s3",
  fwMode: "base", // "base" | "custom"
  customFile: null,
  isFlashing: false,
};

const el = {
  serialBadge: document.getElementById("serial-badge"),
  unsupportedBanner: document.getElementById("unsupported-banner"),
  card1: document.getElementById("card-step-1"),
  card2: document.getElementById("card-step-2"),
  card3: document.getElementById("card-step-3"),
  btnConnect: document.getElementById("btn-connect"),
  btnDisconnect: document.getElementById("btn-disconnect"),
  deviceStatus: document.getElementById("device-status"),
  familySelect: document.getElementById("family-select"),
  targetFamilyLabel: document.getElementById("target-family-label"),
  tabBase: document.getElementById("tab-base"),
  tabCustom: document.getElementById("tab-custom"),
  panelBase: document.getElementById("panel-base"),
  panelCustom: document.getElementById("panel-custom"),
  customBinInput: document.getElementById("custom-bin-input"),
  customFileLabel: document.getElementById("custom-file-label"),
  chkIncludeBaseParts: document.getElementById("chk-include-base-parts"),
  partitionLayoutNote: document.getElementById("partition-layout-note"),
  layoutNoteTitle: document.getElementById("layout-note-title"),
  layoutNoteDetail: document.getElementById("layout-note-detail"),
  chkEraseAll: document.getElementById("chk-erase-all"),
  btnFlash: document.getElementById("btn-flash"),
  progressArea: document.getElementById("progress-area"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  terminal: document.getElementById("terminal"),
  btnClearLog: document.getElementById("btn-clear-log"),
  partsPreview: document.getElementById("parts-preview"),
};

const logger = {
  clean() {
    el.terminal.textContent = "";
  },
  writeLine(data) {
    el.terminal.textContent += `${data}\n`;
    el.terminal.scrollTop = el.terminal.scrollHeight;
  },
  write(data) {
    el.terminal.textContent += data;
    el.terminal.scrollTop = el.terminal.scrollHeight;
  },
};

function detectFamilyFromChip(chipName) {
  const upper = String(chipName || "").toUpperCase();
  if (upper.includes("ESP32-S3")) return "esp32s3";
  if (upper.includes("ESP32-C3")) return "esp32c3";
  if (upper.includes("ESP32-S2")) return "esp32s2";
  if (upper.includes("ESP32")) return "esp32";
  return null;
}

async function fetchBinaryUint8(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Impossibile scaricare ${url} (HTTP ${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function updatePartsPreview() {
  const fam = FAMILIES[state.family];
  el.targetFamilyLabel.textContent = fam.label;

  if (el.partitionLayoutNote) {
    const showNote = el.chkIncludeBaseParts.checked;
    el.partitionLayoutNote.hidden = !showNote;
    if (showNote) {
      el.layoutNoteTitle.textContent = `${fam.label} — ${fam.partitionLabel}`;
      el.layoutNoteDetail.textContent = `Offset: Bootloader ${fam.bootloaderHex} · Partitions 0x8000 · boot_app0 0xE000 · App 0x10000`;
    }
  }

  const rows = [];
  if (state.fwMode === "base") {
    rows.push([fam.bootloaderHex, `${state.family}/bootloader.bin (auto)`]);
    rows.push(["0x8000", `${state.family}/partitions.bin (${fam.partitionLabel})`]);
    rows.push(["0xE000", `${state.family}/boot_app0.bin (auto)`]);
    rows.push(["0x10000", `${state.family}/firmware.bin (Base OTA)`]);
  } else {
    const fileName = state.customFile ? state.customFile.name : "Seleziona file .bin...";
    if (el.chkIncludeBaseParts.checked) {
      rows.push([fam.bootloaderHex, `${state.family}/bootloader.bin (auto)`]);
      rows.push(["0x8000", `${state.family}/partitions.bin (${fam.partitionLabel})`]);
      rows.push(["0xE000", `${state.family}/boot_app0.bin (auto)`]);
      rows.push(["0x10000", `${fileName} (tuo firmware)`]);
    } else {
      rows.push(["0x0000", `${fileName} (immagine completa)`]);
    }
  }

  el.partsPreview.innerHTML = rows
    .map(([addr, name]) => `<li><span><code>${addr}</code></span><span>${name}</span></li>`)
    .join("");
}

function updateUIState() {
  const hasDevice = Boolean(state.esploader && state.chipName);
  const hasFirmware = state.fwMode === "base" || Boolean(state.customFile);

  el.card1.classList.toggle("is-ready", hasDevice);
  el.card2.classList.toggle("is-ready", hasFirmware);
  el.card3.classList.toggle("is-ready", hasDevice && hasFirmware && !state.isFlashing);

  el.btnConnect.hidden = hasDevice;
  el.btnDisconnect.hidden = !hasDevice;
  el.btnFlash.disabled = !(hasDevice && hasFirmware) || state.isFlashing;

  updatePartsPreview();
}

async function disconnectDevice() {
  try {
    if (state.transport) {
      await state.transport.disconnect();
    }
  } catch {
    // Ignora errori di chiusura porta già scollegata
  }
  state.port = null;
  state.transport = null;
  state.esploader = null;
  state.chipName = null;

  el.deviceStatus.textContent = "Nessun dispositivo connesso";
  el.deviceStatus.classList.remove("connected");
  updateUIState();
}

async function connectDevice() {
  if (!("serial" in navigator)) {
    logger.writeLine("[ERRORE] Web Serial API non supportata da questo browser.");
    return;
  }

  try {
    logger.writeLine("Selezione porta seriale USB...");
    const port = await navigator.serial.requestPort();
    const transport = new Transport(port, true);

    const esploader = new ESPLoader({
      transport,
      baudrate: 460800,
      terminal: logger,
    });

    el.btnConnect.disabled = true;
    el.deviceStatus.textContent = "Connessione al bootloader...";

    const chipName = await esploader.main();
    state.port = port;
    state.transport = transport;
    state.esploader = esploader;
    state.chipName = chipName;

    const detected = detectFamilyFromChip(chipName);
    if (detected && FAMILIES[detected]) {
      state.family = detected;
      el.familySelect.value = detected;
      logger.writeLine(`[OK] Dispositivo pronto: ${chipName} -> target selezionato: ${FAMILIES[detected].label}`);
    } else {
      logger.writeLine(`[OK] Dispositivo pronto: ${chipName}`);
      logger.writeLine(`[AVVISO] Chip "${chipName}" non riconosciuto automaticamente: verifica la famiglia selezionata nello Step 1.`);
    }

    el.deviceStatus.textContent = `Connesso: ${chipName}`;
    el.deviceStatus.classList.add("connected");
  } catch (err) {
    logger.writeLine(`[ERRORE] Connessione fallita: ${err.message || err}`);
    await disconnectDevice();
  } finally {
    el.btnConnect.disabled = false;
    updateUIState();
  }
}

async function buildFileArray() {
  const fam = FAMILIES[state.family];
  const fileArray = [];
  const includeSystemParts =
    state.fwMode === "base" || el.chkIncludeBaseParts.checked;

  if (includeSystemParts) {
    logger.writeLine(
      `Caricamento componenti di sistema [${fam.label}] (bootloader @ ${fam.bootloaderHex}, partitions, boot_app0)...`
    );
    fileArray.push({
      label: `${state.family}/bootloader.bin`,
      address: fam.bootloaderAddress,
      data: await fetchBinaryUint8(`${fam.dir}/bootloader.bin`),
    });
    fileArray.push({
      label: `${state.family}/partitions.bin`,
      address: 0x8000,
      data: await fetchBinaryUint8(`${fam.dir}/partitions.bin`),
    });
    fileArray.push({
      label: `${state.family}/boot_app0.bin`,
      address: 0xE000,
      data: await fetchBinaryUint8(`${fam.dir}/boot_app0.bin`),
    });
  }

  if (state.fwMode === "base") {
    logger.writeLine(`Caricamento Firmware Base OTA [${fam.label}]...`);
    fileArray.push({
      label: `${state.family}/firmware.bin`,
      address: 0x10000,
      data: await fetchBinaryUint8(`${fam.dir}/firmware.bin`),
    });
  } else {
    if (!state.customFile) {
      throw new Error("Nessun file .bin personalizzato selezionato.");
    }
    logger.writeLine(`Lettura file locale: ${state.customFile.name} (${state.customFile.size} byte)...`);
    const buffer = await state.customFile.arrayBuffer();
    const targetAddr = el.chkIncludeBaseParts.checked ? 0x10000 : 0x0000;
    fileArray.push({
      label: state.customFile.name,
      address: targetAddr,
      data: new Uint8Array(buffer),
    });
  }

  return fileArray;
}

async function startFlash() {
  if (!state.esploader || state.isFlashing) return;

  state.isFlashing = true;
  el.progressArea.hidden = false;
  el.progressFill.style.width = "0%";
  el.progressText.textContent = "Preparazione file binari...";
  updateUIState();

  try {
    const fileArray = await buildFileArray();
    const eraseAll = el.chkEraseAll.checked;

    logger.writeLine(
      `Avvio scrittura in Flash (${fileArray.length} partizioni, eraseAll=${eraseAll})...`
    );

    await state.esploader.writeFlash({
      fileArray: fileArray.map(({ data, address }) => ({ data, address })),
      flashSize: "keep",
      eraseAll,
      compress: true,
      reportProgress(fileIndex, written, total) {
        const pct = Math.round((written / total) * 100);
        const label = fileArray[fileIndex]?.label || `File ${fileIndex + 1}`;
        el.progressFill.style.width = `${pct}%`;
        el.progressText.textContent = `${label}: ${pct}% (${written}/${total} byte)`;
      },
    });

    el.progressFill.style.width = "100%";
    el.progressText.textContent = "Flash completato! Riavvio della scheda...";
    logger.writeLine("[OK] Flash completato con successo!");

    await state.transport.setDTR(false);
    await state.transport.setRTS(true);
    await new Promise((r) => setTimeout(r, 100));
    await state.transport.setRTS(false);

    logger.writeLine("Scheda riavviata. Se hai installato il Firmware Base OTA, collegati al Wi-Fi 'ESP-Setup' (password: admin1234) e apri http://192.168.4.1/");
  } catch (err) {
    el.progressText.textContent = `Errore: ${err.message || err}`;
    logger.writeLine(`[ERRORE FLASH] ${err.message || err}`);
  } finally {
    state.isFlashing = false;
    updateUIState();
  }
}

function setFirmwareMode(mode) {
  state.fwMode = mode;
  const isBase = mode === "base";

  el.tabBase.classList.toggle("active", isBase);
  el.tabCustom.classList.toggle("active", !isBase);
  el.panelBase.hidden = !isBase;
  el.panelCustom.hidden = isBase;

  updateUIState();
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serial" in navigator) {
    el.serialBadge.textContent = "Web Serial Supportata";
    el.serialBadge.classList.add("badge-ok");
  } else {
    el.serialBadge.textContent = "Web Serial Non Supportata";
    el.serialBadge.classList.add("badge-warn");
    el.unsupportedBanner.hidden = false;
    el.btnConnect.disabled = true;
  }

  el.btnConnect.addEventListener("click", connectDevice);
  el.btnDisconnect.addEventListener("click", disconnectDevice);
  el.btnFlash.addEventListener("click", startFlash);
  el.btnClearLog.addEventListener("click", () => logger.clean());

  el.familySelect.addEventListener("change", (event) => {
    state.family = event.target.value;
    updateUIState();
  });

  el.tabBase.addEventListener("click", () => setFirmwareMode("base"));
  el.tabCustom.addEventListener("click", () => setFirmwareMode("custom"));

  el.customBinInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0] || null;
    state.customFile = file;
    el.customFileLabel.textContent = file
      ? `File pronto: ${file.name} (${Math.round(file.size / 1024)} KB)`
      : "Seleziona un file .bin dal PC...";
    updateUIState();
  });

  el.chkIncludeBaseParts.addEventListener("change", updatePartsPreview);

  updateUIState();
});
