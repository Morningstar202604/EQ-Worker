#!/bin/bash
# EQ-Worker · Windows 免安装包构建
# 思路：Electron 的 Windows 发行包本身就是「二进制 + resources/app」，
#       在 Linux 上直接替换 resources/app 即可产出可运行的 Windows 程序，
#       不需要 wine；代价是无法改写 exe 内嵌图标与版本资源（图标由窗口运行时设置）。
set -e
cd "$(dirname "$0")"

ELECTRON_MIRROR_URL=${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}
VER=$(node -p "require('./node_modules/electron/package.json').version")
echo "Electron 版本: $VER"

# 1. 取最新网页应用（单文件自包含）
cp -f ../index.html ./index.html
cp -f ../brand/dist/generic/icon-1024.png ./icon.png

# 2. 下载 Windows 二进制
OUT=dist/win
ZIP="electron-v${VER}-win32-x64.zip"
rm -rf "$OUT"
mkdir -p "$OUT"
if [ ! -f "/tmp/$ZIP" ]; then
  echo "下载 $ZIP ..."
  curl -fsSL --retry 3 --max-time 900 -o "/tmp/$ZIP" "${ELECTRON_MIRROR_URL}v${VER}/${ZIP}"
fi
echo "解压 ..."
unzip -q -o "/tmp/$ZIP" -d "$OUT"

# 3. 替换应用内容
rm -f "$OUT/resources/default_app.asar"
mkdir -p "$OUT/resources/app"
cp -f main.js package.json index.html icon.png "$OUT/resources/app/"

# 4. 改名（Electron 会以 package.json 的 productName 作为进程名与标题）
if [ -f "$OUT/electron.exe" ]; then
  mv "$OUT/electron.exe" "$OUT/EQ-Worker.exe"
fi

# 5. 打包为免安装 zip
cd "$OUT"
zip -qr ../EQ-Worker-win-x64.zip .
cd ..

echo "完成："
ls -lh EQ-Worker-win-x64.zip
ls -lh win/EQ-Worker.exe
