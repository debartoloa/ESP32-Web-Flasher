# ESP32 OTA Web Flasher

Progetto completo per **ESP32-S3** composto da:
1. **Firmware base PlatformIO / Arduino** con Access Point Wi-Fi (`ESP-Setup`), supporto **mDNS** (`esp-setup.local`), tabella partizioni **Dual-OTA** (`default_8MB.csv`) e Web Server HTTP integrato per aggiornamenti firmware **Over-The-Air (OTA)** tramite file `.bin`.
2. **Sito web statico pronto per GitHub Pages (`docs/`)** basato su **ESP Web Tools** e **Web Serial API** per flashare la scheda direttamente dal browser via USB.
3. **Script post-build (`copy_firmware.py`)** che esporta automaticamente tutti i binari necessari in `firmware/` al termine di ogni compilazione.

---

## Struttura del Progetto

```text
OTA-ESP32/
├── platformio.ini              # Configurazione PlatformIO ESP32-S3 + Dual-OTA + extra_scripts
├── copy_firmware.py            # Script post-build per copiare i 4 binari in firmware/
├── src/
│   └── main.cpp                # Firmware ESP32-S3 (Serial, Wi-Fi AP, mDNS, WebServer + Update OTA)
├── .nojekyll                   # Disabilita Jekyll su GitHub Pages
├── index.html                  # Web Flasher UI a 3 step (esptool-js)
├── manifest.json               # Manifest ESP Web Tools di riferimento
├── css/style.css               # Stile Dark Mode responsive
├── js/app.js                   # Logica Web Serial API (esptool-js) e caricamento .bin
├── firmware/                   # Generata automaticamente da copy_firmware.py
│   ├── esp32/                  # ESP32 classico (bootloader @ 0x1000)
│   ├── esp32s3/                # ESP32-S3 (bootloader @ 0x0000)
│   ├── esp32c3/                # ESP32-C3 (bootloader @ 0x0000)
│   └── esp32s2/                # ESP32-S2 (bootloader @ 0x1000)
├── README.md
├── CHANGELOG.md
└── .gitignore
```

---

## Requisiti & Compilazione Firmware

1. Apri il progetto con **PlatformIO** (VS Code o CLI).
2. Compila il firmware:
   ```bash
   pio run
   ```
3. Al termine della compilazione, `copy_firmware.py` copierà automaticamente `bootloader.bin`, `partitions.bin`, `boot_app0.bin` e `firmware.bin` nella cartella `firmware/`.
4. Puoi eseguire lo script anche manualmente in qualsiasi momento:
   ```bash
   python copy_firmware.py
   ```

---

## Primo Flash via Browser (GitHub Pages + Web Serial)

Il sito web nella root del repository utilizza **`esptool-js`** (Web Serial API) con un'interfaccia guidata a **3 step**:

1. **Dispositivo:** collega l'ESP32-S3 via USB e clicca **Seleziona Dispositivo USB** (se necessario usa `BOOT` + `RESET`).
2. **Firmware:** scegli tra:
   - **Firmware Base OTA** (pronto all'uso: stampa saluto + IP su seriale, avvia AP `ESP-Setup` e portale OTA su `192.168.4.1`).
   - **Carica tuo `.bin`:** seleziona un qualsiasi `firmware.bin` compilato sul tuo PC; il flasher aggiunge automaticamente `bootloader.bin` (`0x0000`), `partitions.bin` (`0x8000`) e `boot_app0.bin` (`0xE000`) per eseguire il primo flash completo da zero.
3. **Flash:** scegli se eseguire l'erase completo della memoria (`eraseAll`) e clicca **Flash Firmware**.

Per attivarlo su GitHub Pages:
1. Effettua il push del repository su GitHub (inclusi i file in `firmware/*.bin`).
2. In **Settings → Pages → Source**, seleziona **Deploy from a branch → `main` / `/ (root)`**.
3. Apri l'URL GitHub Pages con **Google Chrome**, **Microsoft Edge** o **Opera** su desktop.

---

## Utilizzo del Firmware & Aggiornamenti OTA

All'avvio:
- Sulla porta seriale a `115200 baud` vengono stampati il messaggio di benvenuto, le credenziali Wi-Fi e l'indirizzo IP dell'Access Point.
- La scheda crea la rete Wi-Fi:
  - **SSID:** `ESP-Setup`
  - **Password:** `admin1234`
- Collegandoti a `ESP-Setup` da PC o smartphone e visitando **`http://192.168.4.1/`** (o `http://esp-setup.local/`), puoi selezionare un nuovo file `.bin` compilato (es. `.pio/build/esp32s3/firmware.bin`), seguire l'avanzamento in percentuale e attendere il riavvio automatico della scheda.
