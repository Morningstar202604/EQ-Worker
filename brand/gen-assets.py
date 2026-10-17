#!/usr/bin/env python3
# 品牌资产生成器：SVG → 各端所需位图
# 产物：brand/dist/{android,windows,store}/**，供安卓工程、桌面壳与上架素材直接取用。
import io
import os
import re
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
ICON_SVG = ROOT / 'logo-icon.svg'
HORIZ_SVG = ROOT / 'logo-horizontal.svg'
MONO_SVG = ROOT / 'logo-mono.svg'

# cairosvg 不做字体回退：本地渲染时统一换成系统存在的 CJK 字体，
# SVG 源文件本身仍保留 Ma Shan Zheng → KaiTi → serif 的优雅回退链。
CJK_FONT = 'Noto Serif CJK SC'


def with_render_font(svg_text):
    return re.sub(r'font-family="[^"]*"', f'font-family="{CJK_FONT}"', svg_text)


def svg_bytes(path, fix_font=False):
    text = Path(path).read_text(encoding='utf8')
    if fix_font:
        text = with_render_font(text)
    return text.encode('utf8')

PAPER = (246, 241, 228, 255)      # #f6f1e4 暖纸底
PAPER_DEEP = (239, 231, 212, 255) # #efe7d4

ANDROID_DENSITIES = {
    'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192
}


def render(svg_path, size, background=None, fix_font=False):
    """SVG → PIL Image（RGBA，可选底色）"""
    png = cairosvg.svg2png(
        bytestring=svg_bytes(svg_path, fix_font=fix_font),
        output_width=size,
        output_height=size,
        background_color='rgba(0,0,0,0)'
    )
    img = Image.open(io.BytesIO(png)).convert('RGBA')
    if background:
        base = Image.new('RGBA', img.size, background)
        base.alpha_composite(img)
        img = base
    return img


def render_width(svg_path, width, height, background=None, fix_font=False):
    png = cairosvg.svg2png(
        bytestring=svg_bytes(svg_path, fix_font=fix_font),
        output_width=width, output_height=height
    )
    img = Image.open(io.BytesIO(png)).convert('RGBA')
    if background:
        base = Image.new('RGBA', img.size, background)
        base.alpha_composite(img)
        img = base
    return img


def ensure(p):
    p.mkdir(parents=True, exist_ok=True)
    return p


def main():
    # ---------- 安卓：各密度方形图标 ----------
    d = ensure(DIST / 'android')
    for dens, px in ANDROID_DENSITIES.items():
        img = render(ICON_SVG, px)
        img.save(d / f'ic_launcher_{dens}.png')
        # 圆形变体（部分 ROM / 快捷方式用）
        round_dir = ensure(DIST / 'android' / 'round')
        mask = Image.new('L', (px * 4, px * 4), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
        r = img.resize((px * 4, px * 4), Image.LANCZOS)
        out = Image.new('RGBA', (px * 4, px * 4), (0, 0, 0, 0))
        out.paste(r, (0, 0), mask)
        out.resize((px, px), Image.LANCZOS).save(round_dir / f'ic_launcher_round_{dens}.png')

    # 自适应图标（Android 8+）：108dp 画布，内容须落在中心 72dp 安全区（即 66.7%）
    fg = 432
    icon_inner = render(ICON_SVG, int(fg * 0.62))
    canvas = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    canvas.paste(icon_inner, ((fg - icon_inner.width) // 2, (fg - icon_inner.height) // 2), icon_inner)
    canvas.save(d / 'ic_launcher_foreground.png')

    # 启动页图标（Android 12+ splash：图标应缩到约 2/3）
    splash = 1080
    inner = render(ICON_SVG, int(splash * 0.46))
    sp = Image.new('RGBA', (splash, splash), (0, 0, 0, 0))
    sp.paste(inner, ((splash - inner.width) // 2, (splash - inner.height) // 2), inner)
    sp.save(d / 'splash_icon.png')

    # 启动页整图（纸底 + 图标），供桌面/安卓启动背景
    bg = Image.new('RGBA', (1080, 1080), PAPER)
    big = render(ICON_SVG, 480)
    bg.paste(big, ((1080 - 480) // 2, (1080 - 480) // 2), big)
    bg.convert('RGB').save(d / 'splash.png')

    # ---------- Windows：ICO 多尺寸 ----------
    w = ensure(DIST / 'windows')
    sizes = [16, 32, 48, 64, 128, 256]
    imgs = [render(ICON_SVG, s) for s in sizes]
    # ICO：必须以最大尺寸为基座，否则 PIL 写出的文件为空
    imgs[0].save(w / 'app.ico', format='ICO', sizes=[(s, s) for s in sizes],
                 append_images=imgs[1:])
    ico_path = w / 'app.ico'
    if ico_path.stat().st_size < 1024:  # 兜底：改用最大图作基座重写
        imgs[-1].save(ico_path, format='ICO', sizes=[(s, s) for s in sizes],
                      append_images=list(reversed(imgs[:-1])))
    render(ICON_SVG, 256).save(w / 'app-256.png')

    # ---------- 商店素材 ----------
    s = ensure(DIST / 'store')
    render(ICON_SVG, 512).save(s / 'store-icon-512.png')                  # 商店图标
    render_width(HORIZ_SVG, 1024 * 2, 500 * 2, PAPER, fix_font=True).convert('RGB').save(
        s / 'feature-graphic-1024x500.png')                                # Google Play 横幅
    render_width(HORIZ_SVG, 1320, 360, fix_font=True).save(s / 'logo-horizontal-1320.png')

    # ---------- 通用 ----------
    g = ensure(DIST / 'generic')
    render(ICON_SVG, 1024).save(g / 'icon-1024.png')
    render_width(HORIZ_SVG, 1320, 360, PAPER, fix_font=True).convert('RGB').save(g / 'logo-horizontal.png')
    # 深色底单色版（当前色设为纸色）
    mono_src = MONO_SVG.read_text(encoding='utf8')
    mono_light = ROOT / '.mono-light.svg'
    mono_light.write_text(mono_src.replace('<svg xmlns', '<svg fill="#f6f1e4" xmlns', 1), encoding='utf8')
    render(mono_light, 512).save(g / 'logo-mono-light-512.png')
    mono_light.unlink()

    print('产物清单：')
    for p in sorted(DIST.rglob('*')):
        if p.is_file():
            print(f'  {p.relative_to(ROOT)}  {p.stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
