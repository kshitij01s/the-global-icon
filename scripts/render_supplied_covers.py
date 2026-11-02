import fitz, shutil
from pathlib import Path
src=Path(r"C:\Users\Kshitij\.cursor\projects\d-Magazine-Project\attachments\c302953e-a29c-4c7e-8fcd-0661de438164")
out=Path(r"d:\Magazine Project\storage\development-only\demo-pdf-covers")
out.mkdir(parents=True, exist_ok=True)
pdf_out=Path(r"d:\Magazine Project\storage\development-only\magazines\pdfs\supplied")
pdf_out.mkdir(parents=True, exist_ok=True)
for p in sorted(src.glob("*.pdf"), key=lambda x: x.name.lower()):
    shutil.copy2(p, pdf_out / p.name)
    doc=fitz.open(p)
    pix=doc[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5))
    img=out / f"{p.stem}-cover.png"
    pix.save(str(img))
    print(f"{p.name} pages={doc.page_count} -> {img.name} {pix.width}x{pix.height}")
    doc.close()
print("DONE")
