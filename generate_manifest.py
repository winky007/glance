#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动扫描 img/ 文件夹，生成 img/images.json 清单。
用法：python generate_manifest.py
"""

import os
import json

IMG_DIR = "img"
SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

def main():
    if not os.path.isdir(IMG_DIR):
        os.makedirs(IMG_DIR)
        print(f"已创建 {IMG_DIR}/ 文件夹，请把图片放进去后重新运行此脚本。")
        return

    images = []
    for root, dirs, files in os.walk(IMG_DIR):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in SUPPORTED_EXTS:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, IMG_DIR)
                images.append(rel_path.replace("\\", "/"))

    manifest_path = os.path.join(IMG_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fp:
        json.dump(sorted(images), fp, indent=2, ensure_ascii=False)

    print(f"✅ 已生成 {len(images)} 张图片清单 → {manifest_path}")
    if images:
        print("示例：")
        for img in images[:5]:
            print(f"   {img}")
        if len(images) > 5:
            print(f"   ... 还有 {len(images) - 5} 张")

if __name__ == "__main__":
    main()