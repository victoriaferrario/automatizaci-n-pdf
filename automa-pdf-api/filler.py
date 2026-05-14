import fitz

def fill_pdf(template_path: str, field_map: list, data: dict) -> bytes:
    doc = fitz.open(template_path)
    page = doc[0]

    print(f"Page size: width={page.rect.width}, height={page.rect.height}")

    for field in field_map:
        name = field["name"]
        value = str(data.get(name, ""))
        if not value:
            print(f"Warning: no data found for field '{name}'")
            continue

        x = field["pdfX"]
        y = field["pdfY"]
        w = field["pdfW"]
        h = field["pdfH"]

        page_height = page.rect.height

        # Nuestro front end almacena los datos desde abajo a la izquierda 
        # PyMuPDF lo quiere de arriba a la izquierda
        # Entonces...: top_y = page_height - y - h
        top_y = page_height - y - h

        rect = fitz.Rect(x, top_y, x + w, top_y + h)

        print(f"Field '{name}': value='{value}' rect={rect}")

        # chequear si el rectángulo esta dentro de la página 
        if rect.is_empty or rect.is_infinite:
            print(f"  !! Rect is invalid, skipping")
            continue

        result = page.insert_textbox(
            rect,
            value,
            fontsize=10,
            color=(0, 0, 0),
            align=0,
        )

        # insert_textbox devuelve el espacio sobrante (neg si no encuentra )
        if result < 0:
            print(f"  !! Text didn't fit in rect (remaining={result}), trying insert_text instead")
            page.insert_text(
                (x, page_height - y),
                value,
                fontsize=10,
                color=(0, 0, 0),
            )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes