import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const generateInvoicePDF = (data: InvoiceData) => {
  const { order } = data;
  const doc = new jsPDF();
  
  const primaryColor: [number, number, number] = [124, 58, 237]; // #7C3AED
  const accentColor: [number, number, number] = [16, 185, 129]; // #10B981
  const textColor: [number, number, number] = [31, 41, 55]; // #1F2937 - Gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // #F3F4F6

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

  let yPos = 20;

  // ===== HEADER WITH LOGO AND BRANDING =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  // Simple logo badge
  doc.setFillColor(255, 255, 255);
  doc.circle(18, 21, 8, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('JM', 14.5, 24);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('JulineMart', 32, 24);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your trusted marketplace', 32, 31);

  // Invoice Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 170, 24, { align: 'right' });

  yPos = 50;

  // ===== INVOICE INFO BOX =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(130, yPos, 60, 35, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Invoice Number:', 135, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${order.number}`, 135, yPos + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 135, yPos + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(order.date_created), 135, yPos + 28);

  // ===== CUSTOMER INFO =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Bill To:', 20, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  const customerName = `${order.billing.first_name} ${order.billing.last_name}`;
  const wrapText = (text: string, width: number): string[] => doc.splitTextToSize(text, width);

  doc.text(customerName, 20, yPos + 16);
  wrapText(order.billing.address_1, 90).forEach((line: string, idx: number) => {
    doc.text(line, 20, yPos + 22 + idx * 6);
  });
  let addressYOffset = yPos + 22 + 6 * (wrapText(order.billing.address_1, 90).length - 1);
  if (order.billing.address_2) {
    wrapText(order.billing.address_2, 90).forEach((line: string, idx: number) => {
      doc.text(line, 20, addressYOffset + 6 + idx * 6);
    });
    addressYOffset += 6 * wrapText(order.billing.address_2, 90).length;
  }
  doc.text(`${order.billing.city}, ${order.billing.state} ${order.billing.postcode}`, 20, addressYOffset + 6);
  doc.text(order.billing.email, 20, addressYOffset + 12);
  doc.text(order.billing.phone, 20, addressYOffset + 18);

  yPos = Math.max(addressYOffset + 30, yPos + 55);

  // ===== ORDER ITEMS TABLE =====
  const tableData = order.line_items.map((item: any) => [
    item.name,
    item.quantity.toString(),
    formatPrice(item.price.toString()),
    formatPrice(item.total),
  ]);

  const tableResult = autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY =
    (tableResult as any)?.lastAutoTable?.finalY ??
    (doc as any)?.lastAutoTable?.finalY ??
    yPos;
  yPos = finalY + 10;

  // ===== TOTALS BOX =====
  const boxX = 110;
  const boxWidth = 80;
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', boxX, yPos);
  doc.text(formatPrice(order.subtotal), boxX + boxWidth, yPos, { align: 'right' });

  // Shipping
  yPos += 7;
  doc.text('Shipping:', boxX, yPos);
  doc.text(formatPrice(order.shipping_total), boxX + boxWidth, yPos, { align: 'right' });

  // Tax
  if (parseFloat(order.total_tax) > 0) {
    yPos += 7;
    doc.text('Tax:', boxX, yPos);
    doc.text(formatPrice(order.total_tax), boxX + boxWidth, yPos, { align: 'right' });
  }

  // Total - Highlighted
  yPos += 10;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(boxX - 5, yPos - 6, boxWidth + 10, 12, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', boxX, yPos);
  doc.text(formatPrice(order.total), boxX + boxWidth, yPos, { align: 'right' });

  yPos += 20;

  // ===== PAYMENT INFO =====
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(...lightGray);
  doc.roundedRect(20, yPos, 170, 25, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Payment Information', 25, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.text(`Method: ${order.payment_method_title}`, 25, yPos + 15);
  
  if (order.transaction_id) {
    doc.text(`Transaction ID: ${order.transaction_id}`, 25, yPos + 20);
  }

  const statusColor: [number, number, number] = order.date_paid ? accentColor : [234, 179, 8]; // Green or Yellow
  doc.setTextColor(...statusColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${order.date_paid ? 'PAID' : 'PENDING'}`, 130, yPos + 15);

  yPos += 35;

  // ===== SHIPPING INFO =====
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(...lightGray);
  doc.roundedRect(20, yPos, 170, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Shipping Address', 25, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  const shippingName = `${order.shipping.first_name} ${order.shipping.last_name}`;
  doc.text(shippingName, 25, yPos + 15);
  wrapText(order.shipping.address_1, 150).forEach((line: string, idx: number) => {
    doc.text(line, 25, yPos + 20 + idx * 5);
  });
  let shipYOffset = yPos + 20 + 5 * (wrapText(order.shipping.address_1, 150).length - 1);
  if (order.shipping.address_2) {
    wrapText(order.shipping.address_2, 150).forEach((line: string, idx: number) => {
      doc.text(line, 25, shipYOffset + 6 + idx * 5);
    });
    shipYOffset += 5 * wrapText(order.shipping.address_2, 150).length;
  }
  doc.text(`${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}`, 25, shipYOffset + 6);

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 25, 210, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, pageHeight - 16, { align: 'center' });
  doc.text('JulineMart - Your trusted marketplace', 105, pageHeight - 11, { align: 'center' });
  doc.text('Need help? Contact: support@julinemart.com', 105, pageHeight - 6, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice-${order.number}.pdf`);
};



