#!/bin/bash
source .venv/Scripts/activate
pyinstaller main.py
mv dist/main dist/Arachnidium
cp -r theme dist/Arachnidium/
cd bun-api
bun run build
mkdir ../dist/Arachnidium/bun-api
cp Arachnidium-api ../dist/Arachnidium/bun-api/
cd ../dist/Arachnidium
tar -cJf ../Arachnidium.tar.xz .
