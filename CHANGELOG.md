# Changelog

Tutte le modifiche rilevanti a questo progetto saranno documentate in questo file secondo il formato [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il [Semantic Versioning](https://semver.org/lang/it/).

## [1.2.1] - 2026-11-26

### Changed
- Aggiornata la tabella partizioni di `esp32` (ESP32 Classic) ed `esp32c3` (ESP32-C3) a `min_spiffs.csv` (Dual OTA 1.9MB per slot `0x1E0000` + FS `0x20000`) per evitare errori `Not Enough Space` negli aggiornamenti OTA Wi-Fi successivi.
- Mantenuto invariato `partitions.bin` per `esp32s3`.
- Aggiunta nella UI (Step 2 e pannello Componenti Flashati) la nota riepilogativa dello schema partizioni e degli offset esatti applicati al chip selezionato.

## [1.2.0] - 2026-11-18

### Added
- Supporto multi-target per 4 famiglie ESP32 in `platformio.ini` (`esp32`, `esp32s3`, `esp32c3`, `esp32s2`) con tabella Dual-OTA dedicata.
- Esportazione automatica per target in `firmware/<famiglia>/` tramite `copy_firmware.py` con offset bootloader specifici (`0x1000` per `esp32`/`esp32s2`, `0x0000` per `esp32s3`/`esp32c3`).
- Rilevamento automatico del chip collegato via USB in `js/app.js` con selezione automatica della famiglia e degli offset di flash.

## [1.1.2] - 2026-11-18

### Fixed
- Corretto formato dei binari passati a `esptool-js` (`Uint8Array` invece di stringa binaria) per risolvere l'errore `File 1 data must be a Uint8Array`.
- Aggiunto avviso automatico nel log se il chip rilevato via USB non è un `ESP32-S3`.

## [1.1.1] - 2026-11-18

### Changed
- Spostati `index.html`, `manifest.json`, `.nojekyll`, `css/`, `js/` e `firmware/` da `docs/` alla root del repository per il deploy diretto su GitHub Pages (`main` / `/ (root)`).
- Aggiornato `copy_firmware.py` per esportare automaticamente i binari in `firmware/`.

## [1.1.0] - 2026-11-18

### Added
- Interfaccia Web Flasher a 3 step (stile Meshtastic Web Flasher) in `docs/index.html`, `docs/css/style.css` e `docs/js/app.js` basata su `esptool-js` via CDN.
- Possibilità nello Step 2 di scegliere tra **Firmware Base OTA** oppure caricare un file `.bin` personalizzato dal PC.
- Aggiunta automatica dei componenti di primo flash (`bootloader.bin` @ `0x0000`, `partitions.bin` @ `0x8000`, `boot_app0.bin` @ `0xE000`) quando si carica un `firmware.bin` personalizzato (offset `0x10000`).
- Opzione **Full Erase** (`eraseAll`) nello Step 3, barra di avanzamento per partizione e console di log live.

## [1.0.0] - 2026-11-18

### Added
- Configurazione PlatformIO (`platformio.ini`) per scheda generica `esp32-s3-devkitc-1` con partizionamento Dual-OTA (`default_8MB.csv`) e `flash_mode = dio`.
- Firmware base ESP32-S3 (`src/main.cpp`) per **ESP32-S3 OTA Web Flasher** con output seriale a `115200` baud, Access Point Wi-Fi `ESP-Setup` (`admin1234`), supporto mDNS (`esp-setup.local`) e Web Server HTTP su porta `80` con interfaccia OTA integrata (`/` e `/update`).
- Endpoint diagnostico JSON `/api/info` e messa in sicurezza hardware pre-flash (`setSafeHardwareState()`).
- Script post-build `copy_firmware.py` per copiare automaticamente `bootloader.bin`, `partitions.bin`, `boot_app0.bin` e `firmware.bin` in `docs/firmware/`.
- Sito statico per GitHub Pages in `docs/` (`index.html`, `manifest.json`, `css/style.css`, `js/app.js`, `.nojekyll`) configurato con `esp-web-tools` via CDN e offset ESP32-S3 esatti.
- Documentazione di progetto (`README.md`, `CHANGELOG.md`, `.gitignore`).
