import jsPDF from 'jspdf';

interface InvoiceData {
  order: {
    id: number;
    number: string;
    date_created: string;
    date_paid: string | null;
    status: string;
    total: string;
    subtotal: string;
    shipping_total: string;
    total_tax: string;
    currency: string;
    payment_method_title: string;
    transaction_id: string;
    line_items: any[];
    shipping: any;
    billing: any;
  };
}

type LineItemRow = {
  item: string;
  qty: string;
  price: string;
  total: string;
};

const renderLineItemsTable = (
  doc: jsPDF,
  rows: LineItemRow[],
  startY: number,
  colors: {
    primary: [number, number, number];
    text: [number, number, number];
    highlight: [number, number, number];
  }
) => {
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = doc.internal.pageSize.width;
  const tableWidth = pageWidth - marginLeft - marginRight;
  const columnRatios = [0.55, 0.15, 0.15, 0.15];
  const columnWidths = columnRatios.map((ratio) => tableWidth * ratio);
  const columnX: number[] = [];
  columnWidths.forEach((width, index) => {
    if (index === 0) {
      columnX.push(marginLeft);
    } else {
      columnX.push(columnX[index - 1] + columnWidths[index - 1]);
    }
  });

  let currentY = startY;
  const headerHeight = 9;

  doc.setFillColor(...colors.primary);
  doc.rect(marginLeft, currentY - 1, tableWidth, headerHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const headerTextY = currentY + headerHeight - 3;
  doc.text('Item', columnX[0] + 2, headerTextY);
  doc.text('Qty', columnX[1] + columnWidths[1] / 2, headerTextY, { align: 'center' });
  doc.text('Price', columnX[2] + columnWidths[2] - 2, headerTextY, { align: 'right' });
  doc.text('Total', columnX[3] + columnWidths[3] - 2, headerTextY, { align: 'right' });

  currentY += headerHeight + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.text);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.1);
  doc.line(marginLeft, currentY - 2, marginLeft + tableWidth, currentY - 2);

  const lineHeight = 4.4;
  const rowPadding = 2.4;

  rows.forEach((row, index) => {
    const itemLines = doc.splitTextToSize(row.item, columnWidths[0] - 4);
    const rowHeight = Math.max(itemLines.length, 1) * lineHeight + rowPadding * 2;

    if (index % 2 === 1) {
      doc.setFillColor(...colors.highlight);
      doc.rect(marginLeft, currentY, tableWidth, rowHeight, 'F');
    }

    doc.setDrawColor(229, 231, 235);
    doc.line(marginLeft, currentY, marginLeft + tableWidth, currentY);
    doc.line(marginLeft, currentY + rowHeight, marginLeft + tableWidth, currentY + rowHeight);

    const textStartY = currentY + rowPadding + lineHeight / 2 + 1;
    itemLines.forEach((line, lineIndex) => {
      doc.text(line, columnX[0] + 2, textStartY + lineIndex * lineHeight);
    });

    const centerY = currentY + rowHeight / 2 + 1;
    doc.text(row.qty, columnX[1] + columnWidths[1] / 2, centerY, { align: 'center' });
    doc.text(row.price, columnX[2] + columnWidths[2] - 2, centerY, { align: 'right' });
    doc.text(row.total, columnX[3] + columnWidths[3] - 2, centerY, { align: 'right' });

    currentY += rowHeight;
  });

  doc.line(marginLeft, currentY, marginLeft + tableWidth, currentY);
  return currentY;
};

// Function to load image and convert to base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
};

export const generateInvoicePDF = async (data: InvoiceData) => {
  const { order } = data;
  const doc = new jsPDF();
  
  const primaryColor: [number, number, number] = [119, 8, 138]; // #77088a - JulineMart Purple
  const accentColor: [number, number, number] = [16, 185, 129]; // #10B981 - Green
  const orangeColor: [number, number, number] = [249, 115, 22]; // #F97316 - Orange
  const textColor: [number, number, number] = [31, 41, 55]; // #1F2937 - Gray-800
  const lightGray: [number, number, number] = [249, 250, 251]; // #F9FAFB - Very light gray

  // Load logo from environment variable or use default Cloudinary URL
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 
    'https://res.cloudinary.com/dupgdbwrt/image/upload/v1759971092/icon-512x512.png_ygtda9.png';
  
  let logoBase64 = '';
  try {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } catch (error) {
    console.warn('Failed to load logo, will use placeholder');
  }

  // Helper function to format price
  const formatPrice = (price: string) => {
    const amount = parseFloat(price);
    if (isNaN(amount)) {
      return 'NGN 0.00';
    }
    return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number): string[] => {
    return doc.splitTextToSize(text, maxWidth);
  };

  let yPos = 20;

  // ===== HEADER WITH LOGO AND BRANDING =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 35, 'F');

  // Add actual logo if loaded, otherwise use placeholder
  if (logoBase64) {
    try {
      doc.addImage(
        logoBase64,
        'PNG',
        10,        // X position
        10,        // Y position
        15,        // Width
        15         // Height
      );
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      // Fall back to placeholder
      renderPlaceholderLogo();
    }
  } else {
    renderPlaceholderLogo();
  }

  // Placeholder logo function
  function renderPlaceholderLogo() {
    doc.setFillColor(...orangeColor);
    doc.circle(17.5, 17.5, 7, 'F');
    
    doc.setFillColor(255, 255, 255);
    doc.circle(17.5, 17.5, 5.5, 'F');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('JM', 13.5, 19.5);
  }

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JulineMart', 30, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Your trusted marketplace', 30, 21);

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 175, 18, { align: 'right' });

  yPos = 42;

  // ===== TWO COLUMN LAYOUT: Customer Info (Left) | Invoice Info (Right) =====
  
  // Left Column - Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Bill To:', 20, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  
  const customerName = `${order.billing.first_name} ${order.billing.last_name}`;
  doc.text(customerName, 20, yPos + 5);
  
  const address1Lines = wrapText(order.billing.address_1, 70);
  let leftY = yPos + 10;
  address1Lines.forEach((line: string, idx: number) => {
    doc.text(line, 20, leftY + idx * 4);
  });
  leftY += address1Lines.length * 4;
  
  if (order.billing.address_2 && order.billing.address_2.trim()) {
    const address2Lines = wrapText(order.billing.address_2, 70);
    address2Lines.forEach((line: string, idx: number) => {
      doc.text(line, 20, leftY + idx * 4);
    });
    leftY += address2Lines.length * 4;
  }
  
  doc.text(`${order.billing.city}, ${order.billing.state} ${order.billing.postcode}`, 20, leftY);
  doc.text(order.billing.email, 20, leftY + 4);
  doc.text(order.billing.phone, 20, leftY + 8);

  // Right Column - Invoice Info Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(130, yPos - 2, 60, 28, 2, 2, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Invoice Number:', 135, yPos + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`#${order.number}`, 135, yPos + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Date:', 135, yPos + 14);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatDate(order.date_created), 135, yPos + 19);

  yPos = Math.max(leftY + 18, yPos + 35);

  // ===== ORDER ITEMS TABLE (COMPACT) =====
  const tableData: LineItemRow[] = order.line_items.map((item: any) => {
    const productName = item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name;
    return {
      item: productName,
      qty: item.quantity.toString(),
      price: formatPrice(item.price.toString()),
      total: formatPrice(item.total),
    };
  });

  const finalY = renderLineItemsTable(doc, tableData, yPos, {
    primary: primaryColor,
    text: textColor,
    highlight: lightGray,
  });
  yPos = finalY + 8;

  // ===== TOTALS BOX (COMPACT, RIGHT ALIGNED) =====
  const boxX = 115;
  const boxWidth = 75;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  
  // Subtotal
  doc.text('Subtotal:', boxX, yPos);
  doc.text(formatPrice(order.subtotal), boxX + boxWidth, yPos, { align: 'right' });

  // Shipping
  yPos += 5;
  doc.text('Shipping:', boxX, yPos);
  doc.text(formatPrice(order.shipping_total), boxX + boxWidth, yPos, { align: 'right' });

  // Tax
  if (parseFloat(order.total_tax) > 0) {
    yPos += 5;
    doc.text('Tax:', boxX, yPos);
    doc.text(formatPrice(order.total_tax), boxX + boxWidth, yPos, { align: 'right' });
  }

  // Total - Orange highlight
  yPos += 8;
  doc.setFillColor(...orangeColor);
  doc.roundedRect(boxX - 3, yPos - 5, boxWidth + 6, 10, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', boxX, yPos);
  doc.text(formatPrice(order.total), boxX + boxWidth, yPos, { align: 'right' });

  yPos += 12;

  // ===== PAYMENT INFO & SHIPPING ADDRESS (TWO COLUMNS) =====
  const leftColX = 20;
  const rightColX = 110;
  
  // Payment Info (Left)
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(leftColX, yPos, 85, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Payment Information', leftColX + 3, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text(`Method: ${order.payment_method_title}`, leftColX + 3, yPos + 10);
  
  if (order.transaction_id && order.transaction_id.trim()) {
    const txId = order.transaction_id.length > 30 ? 
      order.transaction_id.substring(0, 27) + '...' : 
      order.transaction_id;
    doc.text(`Transaction ID: ${txId}`, leftColX + 3, yPos + 14);
  }

  // Status badge
  const statusColor: [number, number, number] = order.date_paid ? accentColor : orangeColor;
  const statusText = order.date_paid ? 'PAID' : 'PENDING';
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(leftColX + 60, yPos + 7, 22, 8, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(statusText, leftColX + 71, yPos + 12, { align: 'center' });

  // Shipping Address (Right)
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(rightColX, yPos, 80, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Shipping Address', rightColX + 3, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  
  const shippingName = `${order.shipping.first_name} ${order.shipping.last_name}`;
  doc.text(shippingName, rightColX + 3, yPos + 10);
  
  const shipAddress = `${order.shipping.address_1}, ${order.shipping.city}`;
  const shipLines = wrapText(shipAddress, 70);
  shipLines.slice(0, 1).forEach((line: string, idx: number) => {
    doc.text(line, rightColX + 3, yPos + 14 + idx * 3.5);
  });

  yPos += 25;

  // ===== FOOTER (COMPACT) =====
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 15, 210, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, pageHeight - 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('JulineMart - Your trusted marketplace', 105, pageHeight - 6, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Need help? Contact: support@julinemart.com', 105, pageHeight - 3, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice-${order.number}.pdf`);
};
