
from PIL import Image, ImageOps
import os

img_path = r'C:/Users/luong/.gemini/antigravity/brain/ef5ec4c3-6428-40fb-9dff-c5c17822f4b3/uploaded_image_1768806551770.png'
save_dir_frontend = r'f:/build-test/LyangPOS/frontend/public'
save_dir_backend = r'f:/build-test/LyangPOS/backend'

img = Image.open(img_path)
print(f"Original size: {img.size}")
print(f"Mode: {img.mode}")

# If the image has an alpha channel, we can trim it
if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        print(f"Cropped size (alpha): {img.size}")
        
    # Make it square
    width, height = img.size
    new_size = max(width, height)
    new_img = Image.new("RGBA", (new_size, new_size), (0, 0, 0, 0))
    new_img.paste(img, ((new_size - width) // 2, (new_size - height) // 2))
    img = new_img
    print(f"Square size: {img.size}")

# If it doesn't have alpha but has a white background, we could trim that too, 
# but usually these generated images have transparency or we want to keep the rounded corners.
# Let's assume the user wants the rounded square to be the edge.

# Convert to RGBA if not already
img = img.convert("RGBA")

# Resize and save for frontend
img.save(os.path.join(save_dir_frontend, 'logo.png'))
img.save(os.path.join(save_dir_frontend, 'icon.png'))

# Save as ICO with multiple sizes (16, 32, 48, 64, 128, 256)
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(os.path.join(save_dir_frontend, 'favicon.ico'), sizes=icon_sizes)
img.save(os.path.join(save_dir_backend, 'favicon.ico'), sizes=icon_sizes)

print("Icons updated successfully.")
