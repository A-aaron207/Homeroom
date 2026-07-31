import os
from PIL import Image, ImageDraw

ICON_SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512]
ICONS_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

def create_homeroom_icon(size, is_maskable=False):
    render_size = size * 2 if size < 256 else size
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = 0 if is_maskable else int(render_size * 0.08)
    corner_radius = 0 if is_maskable else int(render_size * 0.22)

    bbox = [margin, margin, render_size - margin, render_size - margin]
    
    if is_maskable:
        draw.rectangle([0, 0, render_size, render_size], fill=(12, 12, 32, 255))
    else:
        draw.rounded_rectangle(bbox, radius=corner_radius, fill=(12, 12, 32, 255))

    padding = int(render_size * 0.14) if is_maskable else margin + int(render_size * 0.06)
    inner_bbox = [padding, padding, render_size - padding, render_size - padding]
    inner_radius = int(render_size * 0.16)
    draw.rounded_rectangle(inner_bbox, radius=inner_radius, fill=(99, 102, 241, 255))

    cx, cy = render_size // 2, render_size // 2
    h_height = int(render_size * 0.38)
    h_width = int(render_size * 0.32)
    bar_thick = max(2, int(render_size * 0.08))

    left_x = cx - h_width // 2
    right_x = cx + h_width // 2
    top_y = cy - h_height // 2
    bot_y = cy + h_height // 2

    draw.rounded_rectangle([left_x - bar_thick//2, top_y, left_x + bar_thick//2, bot_y], radius=bar_thick//2, fill=(255, 255, 255, 255))
    draw.rounded_rectangle([right_x - bar_thick//2, top_y, right_x + bar_thick//2, bot_y], radius=bar_thick//2, fill=(255, 255, 255, 255))
    draw.rounded_rectangle([left_x, cy - bar_thick//2, right_x, cy + bar_thick//2], radius=bar_thick//2, fill=(238, 242, 255, 255))

    d_size = int(render_size * 0.07)
    draw.polygon([
        (cx, top_y - d_size),
        (cx + d_size, top_y),
        (cx, top_y + d_size),
        (cx - d_size, top_y)
    ], fill=(251, 191, 36, 255))

    if render_size != size:
        img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    return img

def main():
    print("Generating PWA icons...")
    for s in ICON_SIZES:
        icon = create_homeroom_icon(s)
        path = os.path.join(ICONS_DIR, f'icon-{s}.png')
        icon.save(path, 'PNG')
        print(f" Saved: {path}")

    maskable = create_homeroom_icon(512, is_maskable=True)
    maskable_path = os.path.join(ICONS_DIR, 'icon-maskable-512.png')
    maskable.save(maskable_path, 'PNG')
    print(f" Saved: {maskable_path}")

    apple_icon = create_homeroom_icon(180)
    apple_path = os.path.join(ICONS_DIR, 'apple-touch-icon.png')
    apple_icon.save(apple_path, 'PNG')
    print(f" Saved: {apple_path}")

    print("All icons generated successfully!")

if __name__ == '__main__':
    main()
