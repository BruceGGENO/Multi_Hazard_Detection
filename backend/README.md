# Local landslide model service

Run from the repository root, using the shared root `.env.local`:

```sh
python -m venv .venv
# Windows: .venv/Scripts/python.exe
# macOS/Linux: .venv/bin/python
python -m pip install -r backend/requirements.txt
python -m backend.run
```

In these last two commands, use your activated virtual environment's Python or the explicit platform path above. The launcher loads `.env.local` and binds to `127.0.0.1:8000`; it does not expose the server publicly. Set a random `HAZARD_API_KEY` of at least 32 characters in that file. The frontend uses the same local key.

Training and inference are in `main.py`; outbound restrictions are in `local_network.py`. The input asset is `../data/Complete-data.csv`; its codes, provenance status and limitations are documented in [data/README.md](../data/README.md). The service rejects external connections and requires authenticated model/inference requests.

Test using `python -m pytest backend -q` from the root. This directory is a Python package: do not run `python backend/main.py` as a standalone script. See the root [README](../README.md) for complete database/frontend setup and demonstration scope.
