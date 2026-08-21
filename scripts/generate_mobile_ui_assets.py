#!/usr/bin/env python3
"""
Script to stitch and generate consolidated full-page mobile UI screenshot assets
from source screenshots in contoh-ui/ into docs/contoh-ui-mobile/assets/
"""

import os
from PIL import Image, ImageDraw

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../contoh-ui'))
ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../docs/contoh-ui-mobile/assets'))
TARGET_W = 585

os.makedirs(ASSETS_DIR, exist_ok=True)

def generate_screen_awal():
    """Side-by-side composite for Splash Screen and PIN Lock Screen."""
    im1 = Image.open(os.path.join(SRC_DIR, '0. screen-awal/1.page-1.png'))
    im2 = Image.open(os.path.join(SRC_DIR, '0. screen-awal/2.page-2.png'))
    w, h = im1.size
    gap = 40
    header_h = 70
    canvas_w = w * 2 + gap + 60
    canvas_h = h + header_h + 40

    screen_awal_combo = Image.new('RGBA', (canvas_w, canvas_h), (24, 32, 54, 255))
    draw = ImageDraw.Draw(screen_awal_combo)

    # Paste images
    screen_awal_combo.paste(im1, (30, header_h))
    screen_awal_combo.paste(im2, (30 + w + gap, header_h))

    # Draw step labels
    draw.text((30 + w // 2, 35), 'Step 1: Splash Screen', fill=(255, 255, 255, 255), anchor='mm')
    draw.text((30 + w + gap + w // 2, 35), 'Step 2: PIN Lock Screen (6-Digit)', fill=(255, 255, 255, 255), anchor='mm')

    out_path = os.path.join(ASSETS_DIR, '00-screen-awal.png')
    screen_awal_combo.save(out_path)
    print(f'[OK] Generated: {out_path} ({screen_awal_combo.size})')

def generate_beranda():
    """Full-page vertical stitch for Beranda (Dashboard)."""
    b1 = Image.open(os.path.join(SRC_DIR, '1.Beranda/Beranda1.png'))
    b2 = Image.open(os.path.join(SRC_DIR, '1.Beranda/Beranda2.png'))
    b3 = Image.open(os.path.join(SRC_DIR, '1.Beranda/Beranda3.png'))
    b4 = Image.open(os.path.join(SRC_DIR, '1.Beranda/Beranda4.png'))

    # B1: Header, hero, trial, greeting, all 4 complete KPI cards (y: 0..1120)
    crop_b1 = b1.crop((0, 0, b1.width, 1120))
    # B2: Laba Bulanan + Tren Saldo charts (y: 170..890)
    crop_b2 = b2.crop((0, 170, b2.width, 890)).resize((TARGET_W, int((890 - 170) * TARGET_W / b2.width)), Image.Resampling.LANCZOS)
    # B3: Ringkasan Hari Ini + Pantau Pengiriman (y: 170..570)
    crop_b3 = b3.crop((0, 170, b3.width, 570)).resize((TARGET_W, int((570 - 170) * TARGET_W / b3.width)), Image.Resampling.LANCZOS)
    # B4: Transaksi Terakhir (5 cards) + Bottom Nav (y: 170..height)
    crop_b4 = b4.crop((0, 170, b4.width, b4.height)).resize((TARGET_W, int((b4.height - 170) * TARGET_W / b4.width)), Image.Resampling.LANCZOS)

    total_h = crop_b1.height + crop_b2.height + crop_b3.height + crop_b4.height
    beranda_full = Image.new('RGBA', (TARGET_W, total_h), (248, 250, 252, 255))

    curr_y = 0
    for crop in [crop_b1, crop_b2, crop_b3, crop_b4]:
        beranda_full.paste(crop, (0, curr_y))
        curr_y += crop.height

    out_path = os.path.join(ASSETS_DIR, '01-beranda-fullpage.png')
    beranda_full.save(out_path)
    print(f'[OK] Generated: {out_path} ({beranda_full.size})')

def generate_laporan():
    """Full-page vertical stitch for Laporan (Transaction Report)."""
    l1 = Image.open(os.path.join(SRC_DIR, '2.Laporan/Laporan1.png'))
    l2 = Image.open(os.path.join(SRC_DIR, '2.Laporan/Laporan2.png'))

    # L1: Title, Search, Filter chips, Date/Vendor, Full Performa Vendor card (y: 0..1000)
    crop_l1 = l1.crop((0, 0, l1.width, 1000))
    # L2: Full Transaction list cards and bottom nav (y: 580..1599)
    crop_l2 = l2.crop((0, 580, l2.width, l2.height)).resize((TARGET_W, int((l2.height - 580) * TARGET_W / l2.width)), Image.Resampling.LANCZOS)

    laporan_full = Image.new('RGBA', (TARGET_W, crop_l1.height + crop_l2.height), (248, 250, 252, 255))
    laporan_full.paste(crop_l1, (0, 0))
    laporan_full.paste(crop_l2, (0, crop_l1.height))

    out_path = os.path.join(ASSETS_DIR, '02-laporan-fullpage.png')
    laporan_full.save(out_path)
    print(f'[OK] Generated: {out_path} ({laporan_full.size})')

def generate_tagihan():
    """Full-page asset for Tagihan (Bills)."""
    t = Image.open(os.path.join(SRC_DIR, '3.Tagihan/Tagihan.png'))
    out_path = os.path.join(ASSETS_DIR, '03-tagihan-fullpage.png')
    t.save(out_path)
    print(f'[OK] Generated: {out_path} ({t.size})')

def generate_pengaturan():
    """Full-page vertical stitch for Pengaturan (Settings)."""
    p1 = Image.open(os.path.join(SRC_DIR, '4.Pengaturan/Pengaturan1.png'))
    p2 = Image.open(os.path.join(SRC_DIR, '4.Pengaturan/Pengaturan2.png'))
    p3 = Image.open(os.path.join(SRC_DIR, '4.Pengaturan/Pengaturan3.png'))

    # P1: Header, Profil, and complete Manajemen Data (y: 0..960)
    crop_p1 = p1.crop((0, 0, p1.width, 960))
    # P2: Penyimpanan (progress + Excel import/export) + Laporan & Export PDF (y: 130..1020)
    crop_p2 = p2.crop((0, 130, p2.width, 1020)).resize((TARGET_W, int((1020 - 130) * TARGET_W / p2.width)), Image.Resampling.LANCZOS)
    # P3: Penyimpanan & Backup (Sembunyikan Semua Data) + Footer info + Bottom Nav (y: 400..1326)
    crop_p3 = p3.crop((0, 400, p3.width, p3.height)).resize((TARGET_W, int((p3.height - 400) * TARGET_W / p3.width)), Image.Resampling.LANCZOS)

    pengaturan_full = Image.new('RGBA', (TARGET_W, crop_p1.height + crop_p2.height + crop_p3.height), (248, 250, 252, 255))
    curr_y = 0
    for crop in [crop_p1, crop_p2, crop_p3]:
        pengaturan_full.paste(crop, (0, curr_y))
        curr_y += crop.height

    out_path = os.path.join(ASSETS_DIR, '04-pengaturan-fullpage.png')
    pengaturan_full.save(out_path)
    print(f'[OK] Generated: {out_path} ({pengaturan_full.size})')

def generate_tambah_transaksi():
    """Full-page vertical stitch for Tambah Transaksi (4 Sections Form)."""
    tt1 = Image.open(os.path.join(SRC_DIR, '5.Tambah-Transaksi/Tambah-Transaksi1.png'))
    tt2 = Image.open(os.path.join(SRC_DIR, '5.Tambah-Transaksi/Tambah-Transaksi2.png'))
    tt3 = Image.open(os.path.join(SRC_DIR, '5.Tambah-Transaksi/Tambah-Transaksi-3.png'))
    tt4 = Image.open(os.path.join(SRC_DIR, '5.Tambah-Transaksi/Tambah-Transaksi-4.png'))

    # TT1: Top Dark AppBar + Seksi 1 Informasi Dasar (y: 0..894)
    crop_tt1 = tt1.resize((TARGET_W, int(tt1.height * TARGET_W / tt1.width)), Image.Resampling.LANCZOS)
    # TT2: Seksi 2 Aktivitas (skip appbar y: 0..170, take y: 170..993)
    crop_tt2 = tt2.crop((0, 170, tt2.width, tt2.height)).resize((TARGET_W, int((tt2.height - 170) * TARGET_W / tt2.width)), Image.Resampling.LANCZOS)
    # TT3: Seksi 3 Keuangan (skip appbar y: 0..170, take y: 170..1050)
    crop_tt3 = tt3.crop((0, 170, tt3.width, 1050)).resize((TARGET_W, int((1050 - 170) * TARGET_W / tt3.width)), Image.Resampling.LANCZOS)
    # TT4: Seksi 4 Detail Tambahan + Sticky Button (skip appbar y: 0..170, take y: 170..1327)
    crop_tt4 = tt4.crop((0, 170, tt4.width, tt4.height)).resize((TARGET_W, int((tt4.height - 170) * TARGET_W / tt4.width)), Image.Resampling.LANCZOS)

    tt_full = Image.new('RGBA', (TARGET_W, crop_tt1.height + crop_tt2.height + crop_tt3.height + crop_tt4.height), (248, 250, 252, 255))
    curr_y = 0
    for crop in [crop_tt1, crop_tt2, crop_tt3, crop_tt4]:
        tt_full.paste(crop, (0, curr_y))
        curr_y += crop.height

    out_path = os.path.join(ASSETS_DIR, '05-tambah-transaksi-fullpage.png')
    tt_full.save(out_path)
    print(f'[OK] Generated: {out_path} ({tt_full.size})')

if __name__ == '__main__':
    print('Generating perfected consolidated mobile UI assets...')
    generate_screen_awal()
    generate_beranda()
    generate_laporan()
    generate_tagihan()
    generate_pengaturan()
    generate_tambah_transaksi()
    print('All assets generated with pixel precision!')
