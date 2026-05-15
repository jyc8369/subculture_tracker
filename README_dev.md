# Subculture Tracker

A tool for collecting and visualizing gacha record data. It primarily extracts gacha data for Wuthering Waves and Arknights Endfield, saves it as JSON files, and allows viewing through a web interface.

## Features

- **Wuthering Waves data collection** (`wuwa.py`)
  - Extracts WWA gacha record URLs from logs
  - Retrieves gacha records from external APIs and converts them into JSON
- **Endfield data collection** (`endfield.py`)
  - Calls the Endfield webview JSON API
  - Organizes badge/item data and saves it as JSON
- **Web dashboard** (`app.py`, `web/`)
  - Provides a Flask-based UI
  - Lists saved JSON data and allows selection/loading
  - Built as an SPA to review results in the browser

## Requirements

- Python 3.7+
- Packages listed in `requirements.txt`

### Installation
```bash
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Open your browser to `http://127.0.0.1:5000`.

## Usage

1. Run `app.py`.
2. Use the web UI to export data or select saved JSON files.
3. Check the `data/` folder for generated `wuwa_*.json` or `endfield_*.json` files.

## Root File Descriptions

- `app.py`: Defines the Flask web server and routes
- `endfield.py`: Endfield gacha record extraction and JSON save logic
- `wuwa.py`: Wuthering Waves gacha URL parsing and data extraction logic
- `requirements.txt`: List of required Python packages
- `README.md`: This document
- `ex_json.md`: Common JSON schema and field descriptions
- `test.html`: Test HTML file
- `.gitignore`: Git ignore settings

## Folder Descriptions

- `data/`
  - Storage location for web settings and collected JSON data
  - Examples: `wuwa_*.json`, `endfield_*.json`, `web-setting.json`
- `web/`
  - Static HTML, CSS, and JavaScript resources
  - Game tracker pages are under `web/game/`
- `alpha_dev/`
  - Additional development files and supporting materials
- `.venv/`
  - Local Python virtual environment (if created)

## Notes

- Depending on the actual code structure, `parser.py` and `data_exporter.py` files are not currently present in the root.
- `app.py` runs the Flask app and processes `wuwa` and `endfield` data through the `/exporter` endpoint.
- `ex_json.md` explains the project-wide JSON field rules.
