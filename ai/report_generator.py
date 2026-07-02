import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ReportGenerator")

try:
    import qrcode
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether
    HAS_REPORTLAB = True
except ImportError:
    logger.warning("reportlab or qrcode not installed. PDF generation will run in fallback mode.")
    HAS_REPORTLAB = False

def resolve_evidence_path(path_value: str, output_pdf_path: str) -> str:
    if not path_value:
        return ""
    if os.path.exists(path_value):
        return path_value

    reports_dir = os.path.dirname(os.path.abspath(output_pdf_path))
    backend_dir = os.path.dirname(reports_dir)
    normalized = path_value.replace("\\", "/")

    if normalized.startswith("/uploads/") or normalized.startswith("uploads/"):
        filename = os.path.basename(normalized)
        candidate = os.path.join(backend_dir, "uploads", filename)
        return candidate if os.path.exists(candidate) else path_value

    candidate = os.path.join(backend_dir, normalized.lstrip("/"))
    return candidate if os.path.exists(candidate) else path_value

def generate_pdf_report(report_data: dict, output_pdf_path: str) -> bool:
    """
    Generates a professional PDF violation report.
    
    Args:
        report_data: Dictionary containing violation details:
            - id: Violation ID
            - vehicle_number: License plate text
            - vehicle_type: car, bus, truck, motorcycle
            - violation_type: Classified violation
            - confidence: Detection confidence (0.0 to 1.0)
            - summary: AI-written violation summary
            - review_status: Pending, Approved, Rejected
            - latitude: Coordinates
            - longitude: Coordinates
            - location: Readable location text
            - image_path: Original evidence image path
            - annotated_path: Annotated image path
            - created_at: Datetime object or formatted string
            - reviewer_name: Name of reviewer (if approved/rejected)
            - qr_url: URL for the QR code
        output_pdf_path: Path where the PDF should be saved
        
    Returns:
        bool: True if successful, False otherwise
    """
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    
    if not HAS_REPORTLAB:
        logger.error("Cannot generate PDF: ReportLab or qrcode library is missing.")
        # Create a text file fallback so the file exists and backend doesn't crash
        try:
            with open(output_pdf_path, 'w') as f:
                f.write(f"--- CIVICSENSE AI REPORT ---\n")
                f.write(f"ID: {report_data.get('id')}\n")
                f.write(f"Plate: {report_data.get('vehicle_number')}\n")
                f.write(f"Violation: {report_data.get('violation_type')}\n")
                f.write(f"Confidence: {report_data.get('confidence')}\n")
                f.write(f"Coordinates: {report_data.get('latitude')}, {report_data.get('longitude')}\n")
                f.write(f"Summary: {report_data.get('summary')}\n")
                f.write(f"Status: {report_data.get('review_status')}\n")
            logger.info("Created text fallback report.")
            return True
        except Exception as e:
            logger.error(f"Failed to create fallback report: {e}")
            return False

    try:
        # 1. Setup Document
        doc = SimpleDocTemplate(
            output_pdf_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # 2. Custom Styles for Premium Look
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            textColor=colors.HexColor('#0F172A'), # Slate 900
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=colors.HexColor('#2563EB'), # Blue 600
            spaceAfter=15,
            textTransform='uppercase'
        )
        
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=6,
            borderPadding=2
        )
        
        body_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            leading=12
        )
        
        summary_box_style = ParagraphStyle(
            'SummaryBox',
            parent=styles['BodyText'],
            fontName='Helvetica-Oblique',
            fontSize=10,
            textColor=colors.HexColor('#1E293B'),
            leading=14
        )

        story = []
        
        # 3. Header Section (Title + Subtitle + Top Bar)
        header_data = [
            [
                Paragraph("CIVICSENSE AI", title_style),
                Paragraph(f"REPORT ID: {report_data.get('id', 'N/A')}", ParagraphStyle('RightID', parent=body_style, fontName='Helvetica-Bold', alignment=2))
            ],
            [
                Paragraph("Smart Traffic & Civic Compliance Platform", subtitle_style),
                Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ParagraphStyle('RightTime', parent=body_style, alignment=2))
            ]
        ]
        
        header_table = Table(header_data, colWidths=[3.5*inch, 4.0*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        
        # Blue accent line
        line_data = [['']]
        line_table = Table(line_data, colWidths=[7.5*inch], rowHeights=[3])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#2563EB')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 15))
        
        # 4. Metadata Details (Double column table)
        gps = f"{report_data.get('latitude', 'N/A')}, {report_data.get('longitude', 'N/A')}"
        conf_percentage = f"{int(float(report_data.get('confidence', 0.0)) * 100)}%" if report_data.get('confidence') else "N/A"
        
        meta_left = [
            [Paragraph("<b>Vehicle License Plate:</b>", body_style), Paragraph(str(report_data.get('vehicle_number', 'Unable to recognize license plate')), ParagraphStyle('PlateText', parent=body_style, fontName='Helvetica-Bold', fontSize=10))],
            [Paragraph("<b>Vehicle Type:</b>", body_style), Paragraph(str(report_data.get('vehicle_type', 'unknown')).capitalize(), body_style)],
            [Paragraph("<b>Violation Class:</b>", body_style), Paragraph(str(report_data.get('violation_type', 'Illegal Parking')), ParagraphStyle('ViolText', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#DC2626')))],
            [Paragraph("<b>AI Confidence:</b>", body_style), Paragraph(conf_percentage, body_style)],
        ]
        
        meta_right = [
            [Paragraph("<b>Reported Date:</b>", body_style), Paragraph(str(report_data.get('created_at', 'N/A')), body_style)],
            [Paragraph("<b>Reported Location:</b>", body_style), Paragraph(str(report_data.get('location', 'N/A')), body_style)],
            [Paragraph("<b>GPS Coordinates:</b>", body_style), Paragraph(gps, body_style)],
            [Paragraph("<b>Reviewer Status:</b>", body_style), Paragraph(f"<b>{report_data.get('review_status', 'Pending').upper()}</b>", ParagraphStyle('StatusStyle', parent=body_style, textColor=colors.HexColor('#16A34A') if report_data.get('review_status') == 'Approved' else colors.HexColor('#DC2626') if report_data.get('review_status') == 'Rejected' else colors.HexColor('#D97706')))],
        ]
        
        meta_left_table = Table(meta_left, colWidths=[1.5*inch, 2.1*inch], rowHeights=[18]*4)
        meta_left_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        
        meta_right_table = Table(meta_right, colWidths=[1.4*inch, 2.2*inch], rowHeights=[18]*4)
        meta_right_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        
        meta_container = Table([[meta_left_table, meta_right_table]], colWidths=[3.75*inch, 3.75*inch])
        meta_container.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        
        story.append(Paragraph("VIOLATION DOSSIER METADATA", section_heading))
        story.append(meta_container)
        story.append(Spacer(1, 15))
        
        # 5. AI-Written Summary Box
        story.append(Paragraph("AI-GENERATED CASE SUMMARY", section_heading))
        summary_text = report_data.get('summary', 'No summary generated.')
        summary_table = Table([[Paragraph(summary_text, summary_box_style)]], colWidths=[7.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 10),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        # 6. Evidence Images (Side-by-side)
        story.append(Paragraph("VISUAL EVIDENCE (RAW AND ANNOTATED DETECTIONS)", section_heading))
        
        # Load and resize images safely
        img_w = 3.6 * inch
        img_h = 2.4 * inch
        
        left_img = None
        right_img = None
        
        raw_path = resolve_evidence_path(report_data.get('image_path'), output_pdf_path)
        annotated_path = resolve_evidence_path(report_data.get('annotated_path'), output_pdf_path)
        
        # Fallback empty box helper
        def get_fallback_box(text):
            tb = Table([[Paragraph(text, ParagraphStyle('FallbackText', parent=body_style, alignment=1))]], colWidths=[img_w], rowHeights=[img_h])
            tb.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F1F5F9')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            return tb

        if raw_path and os.path.exists(raw_path):
            try:
                left_img = Image(raw_path, width=img_w, height=img_h)
            except Exception as e:
                logger.error(f"Error loading raw image: {e}")
                left_img = get_fallback_box("<b>Raw Image</b><br/>Failed to load file.")
        else:
            left_img = get_fallback_box("<b>Raw Image</b><br/>No image available.")
            
        if annotated_path and os.path.exists(annotated_path):
            try:
                right_img = Image(annotated_path, width=img_w, height=img_h)
            except Exception as e:
                logger.error(f"Error loading annotated image: {e}")
                right_img = get_fallback_box("<b>AI Detections (Annotated)</b><br/>Failed to load file.")
        else:
            # Fall back to raw if annotated is missing, or show box
            if raw_path and os.path.exists(raw_path):
                right_img = get_fallback_box("<b>AI Detections (Annotated)</b><br/>Annotation image pending.")
            else:
                right_img = get_fallback_box("<b>AI Detections (Annotated)</b><br/>No image available.")

        images_table = Table([[left_img, right_img]], colWidths=[3.75*inch, 3.75*inch])
        images_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(images_table)
        story.append(Spacer(1, 20))
        
        # 7. QR Code and Authority Sign-off (Keep Together on bottom)
        # Generate QR code
        qr_url = report_data.get('qr_url', f"http://localhost:5173/history?id={report_data.get('id', 'unknown')}")
        qr_path = output_pdf_path.replace(".pdf", "_qr.png")
        
        try:
            qr = qrcode.QRCode(version=1, box_size=3, border=1)
            qr.add_data(qr_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_img.save(qr_path)
            qr_pdf_img = Image(qr_path, width=1.1*inch, height=1.1*inch)
        except Exception as e:
            logger.error(f"Error generating QR code image: {e}")
            qr_pdf_img = get_fallback_box("QR Link")
            
        sign_style = ParagraphStyle(
            'SignStyle',
            parent=body_style,
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
            leading=10
        )
        
        # Check review details
        reviewer = report_data.get('reviewer_name', 'Pending Authority Review')
        decision = report_data.get('review_status', 'Pending')
        rec_action = report_data.get('recommended_action', 'Request Manual Verification')
        
        sign_text = f"""
        <b>DECISION STATUS:</b> {decision.upper()}<br/>
        <b>REVIEWED BY:</b> {reviewer}<br/>
        <b>RECOMMENDED COMPLIANCE ACTION:</b> {rec_action}<br/>
        <br/>
        <i>Note: This document is an AI-generated digital compliance record verified by local municipal smart traffic controllers.</i>
        """
        
        bottom_table_data = [
            [
                qr_pdf_img,
                Paragraph(sign_text, sign_style),
                Paragraph("<br/><br/>_____________________________________<br/><b>Municipal Officer Digital Seal / Signature</b>", ParagraphStyle('SignLine', parent=body_style, alignment=2, fontSize=9))
            ]
        ]
        
        bottom_table = Table(bottom_table_data, colWidths=[1.3*inch, 3.2*inch, 3.0*inch])
        bottom_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
        ]))
        
        footer_block = KeepTogether([
            Paragraph("OFFICIAL COMPLIANCE SIGN-OFF", section_heading),
            bottom_table
        ])
        story.append(footer_block)
        
        # Build Document
        doc.build(story)
        
        # Clean up temporary QR image file
        if os.path.exists(qr_path):
            try:
                os.remove(qr_path)
            except Exception as e:
                logger.warning(f"Failed to remove temp QR code image: {e}")
                
        logger.info(f"Successfully generated PDF report at: {output_pdf_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error during ReportLab PDF generation: {e}", exc_info=True)
        return False
