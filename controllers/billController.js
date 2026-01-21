import Bill from '../models/Bill.js';
import Order from '../models/Order.js';
import AppSettings from '../models/AppSettings.js';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== Generate Bill HTML ==============
const generateBillHTML = (bill) => {
  const isGST = bill.billingType === 'with_gst';
  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const itemsHTML = bill.items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <div class="item-name">${item.name}</div>
        ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
      </td>
      ${isGST ? `<td class="text-center">${item.hsnCode || '7113'}</td>` : ''}
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${formatCurrency(item.discount)}</td>
      ${isGST ? `<td class="text-right">${formatCurrency(item.taxableAmount)}</td>` : ''}
      <td class="text-right">${formatCurrency(item.totalAmount)}</td>
    </tr>
  `).join('');

  const gstSummaryHTML = isGST ? `
    <div class="gst-summary">
      <div class="gst-summary-header">GST Summary</div>
      <table class="gst-summary-table">
        <thead>
          <tr>
            <th>Tax Type</th>
            <th>Taxable Amount</th>
            <th>Rate</th>
            <th>Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          ${bill.totalCGST > 0 ? `
          <tr>
            <td>CGST</td>
            <td>${formatCurrency(bill.taxableAmount)}</td>
            <td>${bill.items[0]?.cgstRate || 1.5}%</td>
            <td>${formatCurrency(bill.totalCGST)}</td>
          </tr>
          ` : ''}
          ${bill.totalSGST > 0 ? `
          <tr>
            <td>SGST</td>
            <td>${formatCurrency(bill.taxableAmount)}</td>
            <td>${bill.items[0]?.sgstRate || 1.5}%</td>
            <td>${formatCurrency(bill.totalSGST)}</td>
          </tr>
          ` : ''}
          ${bill.totalIGST > 0 ? `
          <tr>
            <td>IGST</td>
            <td>${formatCurrency(bill.taxableAmount)}</td>
            <td>${(bill.items[0]?.cgstRate || 1.5) * 2}%</td>
            <td>${formatCurrency(bill.totalIGST)}</td>
          </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total Tax</td>
            <td>${formatCurrency(bill.totalTax)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  ` : `
    <div class="no-gst-notice">
      <strong>Note:</strong> This is a non-GST invoice. No tax has been charged on this transaction.
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isGST ? 'Tax Invoice' : 'Invoice'} - ${bill.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #333; background: #fff; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; }
    .invoice-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-info h1 { font-size: 28px; font-weight: 700; color: #d4af37; margin-bottom: 8px; }
    .company-info p { font-size: 11px; color: #ccc; line-height: 1.6; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 32px; font-weight: 300; letter-spacing: 4px; margin-bottom: 10px; }
    .invoice-title .invoice-number { background: #d4af37; color: #1a1a2e; padding: 8px 16px; font-weight: 600; font-size: 14px; display: inline-block; }
    .invoice-info { display: flex; padding: 25px 30px; background: #fafafa; border-bottom: 1px solid #eee; }
    .info-block { flex: 1; }
    .info-block:last-child { text-align: right; }
    .info-block h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .info-block p { line-height: 1.7; color: #444; }
    .info-block .highlight { font-weight: 600; color: #1a1a2e; font-size: 13px; }
    .invoice-items { padding: 0 30px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table thead { background: #1a1a2e; color: #fff; }
    .items-table th { padding: 12px 15px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .items-table th:last-child, .items-table th.text-right { text-align: right; }
    .items-table th.text-center { text-align: center; }
    .items-table td { padding: 15px; border-bottom: 1px solid #eee; vertical-align: top; }
    .items-table td:last-child { text-align: right; }
    .items-table td.text-center { text-align: center; }
    .items-table td.text-right { text-align: right; }
    .item-name { font-weight: 600; color: #1a1a2e; }
    .item-desc { font-size: 11px; color: #888; margin-top: 4px; }
    .invoice-summary { display: flex; padding: 20px 30px; background: #fafafa; }
    .summary-notes { flex: 1; padding-right: 30px; }
    .summary-notes h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .summary-notes p { font-size: 11px; color: #666; line-height: 1.6; }
    .summary-totals { width: 280px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .summary-row.subtotal { border-bottom: none; padding-top: 12px; }
    .summary-row .label { color: #666; }
    .summary-row .value { font-weight: 500; color: #333; }
    .summary-row.tax-row { font-size: 11px; }
    .summary-row.tax-row .label { padding-left: 10px; }
    .summary-row.total { background: #1a1a2e; color: #fff; padding: 15px; margin: 15px -15px -15px; border-bottom: none; }
    .summary-row.total .label { color: #fff; font-size: 14px; font-weight: 600; }
    .summary-row.total .value { color: #d4af37; font-size: 20px; font-weight: 700; }
    .amount-words { padding: 15px 30px; background: #fff8e7; border-left: 4px solid #d4af37; margin: 0 30px 20px; }
    .amount-words span { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .amount-words p { font-weight: 600; color: #1a1a2e; margin-top: 4px; }
    .invoice-footer { padding: 25px 30px; display: flex; justify-content: space-between; border-top: 2px solid #1a1a2e; }
    .payment-info h4, .signature h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; }
    .payment-info p { font-size: 11px; color: #444; line-height: 1.8; }
    .signature { text-align: right; }
    .signature-line { width: 180px; height: 60px; border-bottom: 1px solid #333; margin-left: auto; margin-bottom: 8px; }
    .signature p { font-size: 11px; color: #666; }
    .invoice-terms { padding: 20px 30px; background: #fafafa; border-top: 1px solid #eee; }
    .invoice-terms h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    .invoice-terms ol { padding-left: 15px; font-size: 10px; color: #666; line-height: 1.8; }
    .badge { display: inline-block; padding: 3px 8px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 3px; }
    .badge-paid { background: #d4edda; color: #155724; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .gst-summary { margin: 20px 30px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
    .gst-summary-header { background: #f5f5f5; padding: 10px 15px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 1px solid #ddd; }
    .gst-summary-table { width: 100%; border-collapse: collapse; }
    .gst-summary-table th, .gst-summary-table td { padding: 10px 15px; text-align: right; font-size: 11px; border-bottom: 1px solid #eee; }
    .gst-summary-table th { background: #fafafa; font-weight: 600; color: #666; text-transform: uppercase; font-size: 10px; }
    .gst-summary-table th:first-child, .gst-summary-table td:first-child { text-align: left; }
    .gst-summary-table tfoot td { font-weight: 600; background: #fafafa; }
    .no-gst-notice { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 12px 20px; margin: 20px 30px; font-size: 11px; color: #0066cc; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <div class="company-info">
        <h1>${bill.businessName}</h1>
        <p>
          ${bill.businessAddress}<br>
          ${bill.businessPhone ? `Phone: ${bill.businessPhone}<br>` : ''}
          ${bill.businessEmail ? `Email: ${bill.businessEmail}<br>` : ''}
          ${isGST && bill.businessGSTIN ? `<strong>GSTIN: ${bill.businessGSTIN}</strong>` : ''}
        </p>
      </div>
      <div class="invoice-title">
        <h2>${isGST ? 'TAX INVOICE' : 'INVOICE'}</h2>
        <div class="invoice-number">${bill.invoiceNumber}</div>
      </div>
    </div>

    <div class="invoice-info">
      <div class="info-block">
        <h4>Bill To</h4>
        <p class="highlight">${bill.customerName}</p>
        <p>
          ${bill.billingAddress}<br>
          ${bill.customerPhone ? `Phone: ${bill.customerPhone}<br>` : ''}
          ${isGST && bill.customerGSTIN ? `GSTIN: ${bill.customerGSTIN}` : ''}
        </p>
      </div>
      <div class="info-block">
        <h4>Ship To</h4>
        <p class="highlight">${bill.shippingAddress ? 'Different Address' : 'Same as Billing'}</p>
        <p>${bill.shippingAddress || bill.billingAddress}</p>
      </div>
      <div class="info-block">
        <h4>Invoice Details</h4>
        <p>
          <strong>Invoice Date:</strong> ${formatDate(bill.invoiceDate)}<br>
          <strong>Order ID:</strong> ${bill.order.orderId || bill.order}<br>
          <strong>Payment:</strong> <span class="badge badge-${bill.paymentStatus}">${bill.paymentStatus.toUpperCase()}</span><br>
          ${bill.paymentMethod ? `<strong>Payment Mode:</strong> ${bill.paymentMethod}` : ''}
        </p>
      </div>
    </div>

    ${!isGST ? `<div class="no-gst-notice"><strong>Note:</strong> This is a non-GST invoice. No tax has been charged on this transaction.</div>` : ''}

    <div class="invoice-items">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: ${isGST ? '30%' : '40%'}">Item Description</th>
            ${isGST ? '<th class="text-center" style="width: 8%">HSN</th>' : ''}
            <th class="text-center" style="width: 8%">Qty</th>
            <th class="text-right" style="width: 12%">Rate</th>
            <th class="text-right" style="width: 10%">Discount</th>
            ${isGST ? '<th class="text-right" style="width: 12%">Taxable</th>' : ''}
            <th class="text-right" style="width: 12%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    ${isGST ? gstSummaryHTML : ''}

    <div class="invoice-summary">
      <div class="summary-notes">
        <h4>Notes</h4>
        <p>${bill.notes || 'Thank you for your purchase! We appreciate your business.'}</p>
      </div>
      <div class="summary-totals">
        <div class="summary-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatCurrency(bill.subtotal)}</span>
        </div>
        ${bill.totalDiscount > 0 ? `
        <div class="summary-row">
          <span class="label">Discount</span>
          <span class="value">- ${formatCurrency(bill.totalDiscount)}</span>
        </div>
        ` : ''}
        ${isGST ? `
        <div class="summary-row subtotal">
          <span class="label">Taxable Amount</span>
          <span class="value">${formatCurrency(bill.taxableAmount)}</span>
        </div>
        ${bill.totalCGST > 0 ? `
        <div class="summary-row tax-row">
          <span class="label">CGST @ ${bill.items[0]?.cgstRate || 1.5}%</span>
          <span class="value">${formatCurrency(bill.totalCGST)}</span>
        </div>
        ` : ''}
        ${bill.totalSGST > 0 ? `
        <div class="summary-row tax-row">
          <span class="label">SGST @ ${bill.items[0]?.sgstRate || 1.5}%</span>
          <span class="value">${formatCurrency(bill.totalSGST)}</span>
        </div>
        ` : ''}
        ${bill.totalIGST > 0 ? `
        <div class="summary-row tax-row">
          <span class="label">IGST @ ${(bill.items[0]?.cgstRate || 1.5) * 2}%</span>
          <span class="value">${formatCurrency(bill.totalIGST)}</span>
        </div>
        ` : ''}
        ` : ''}
        ${bill.roundOff !== 0 ? `
        <div class="summary-row">
          <span class="label">Round Off</span>
          <span class="value">${formatCurrency(bill.roundOff)}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
          <span class="label">Grand Total</span>
          <span class="value">${formatCurrency(bill.grandTotal)}</span>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <span>Amount in Words</span>
      <p>${bill.amountInWords}</p>
    </div>

    <div class="invoice-footer">
      <div class="payment-info">
        <h4>Contact Us</h4>
        <p>
          ${bill.businessPhone ? `<strong>Phone:</strong> ${bill.businessPhone}<br>` : ''}
          ${bill.businessEmail ? `<strong>Email:</strong> ${bill.businessEmail}<br>` : ''}
        </p>
      </div>
      <div class="signature">
        <h4>Authorized Signatory</h4>
        <div class="signature-line"></div>
        <p>For ${bill.businessName}</p>
      </div>
    </div>

    <div class="invoice-terms">
      <h4>Terms & Conditions</h4>
      <ol>
        ${(bill.termsAndConditions || [
          'Goods once sold will not be taken back or exchanged.',
          'All disputes are subject to local jurisdiction only.',
          'This is a computer generated invoice.',
        ]).map(term => `<li>${term}</li>`).join('')}
      </ol>
    </div>
  </div>
</body>
</html>
  `;
};

// ============== Generate PDF ==============
const generatePDF = async (bill) => {
  const html = generateBillHTML(bill);

  // Create bills directory if not exists
  const billsDir = path.join(__dirname, '../uploads/bills');
  if (!fs.existsSync(billsDir)) {
    fs.mkdirSync(billsDir, { recursive: true });
  }

  const pdfPath = path.join(billsDir, `${bill.invoiceNumber}.pdf`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  });

  await browser.close();

  return `/uploads/bills/${bill.invoiceNumber}.pdf`;
};

// ============== Controllers ==============

// @desc    Generate bill for an order
// @route   POST /api/admin/bills/generate
// @access  Private/Admin
const generateBill = async (req, res) => {
  try {
    const { orderId, billingType = 'with_gst', customerGSTIN, notes } = req.body;

    // Check if bill already exists
    const existingBill = await Bill.findOne({ order: orderId, status: { $ne: 'cancelled' } });
    if (existingBill) {
      return res.status(400).json({
        message: 'Bill already exists for this order',
        bill: existingBill,
      });
    }

    // Get order
    const order = await Order.findById(orderId).populate('user').populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get business settings
    const businessName = await AppSettings.getSetting('business_name', 'Gold Jewellers');
    const businessAddress = await AppSettings.getSetting('business_address', 'Mumbai, Maharashtra');
    const businessPhone = await AppSettings.getSetting('business_phone', '');
    const businessEmail = await AppSettings.getSetting('business_email', '');
    const businessGSTIN = await AppSettings.getSetting('business_gstin', '');
    const cgstRate = await AppSettings.getSetting('cgst_rate', 1.5);
    const sgstRate = await AppSettings.getSetting('sgst_rate', 1.5);

    // Generate invoice number
    const invoiceNumber = await Bill.generateInvoiceNumber();

    // Calculate items and totals
    const isGST = billingType === 'with_gst';
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    const items = order.items.map(item => {
      const unitPrice = item.price;
      const quantity = item.quantity;
      const itemSubtotal = unitPrice * quantity;
      const discount = item.discount || 0;
      const itemTaxable = itemSubtotal - discount;

      let cgstAmount = 0;
      let sgstAmount = 0;
      let itemTotal = itemTaxable;

      if (isGST) {
        cgstAmount = (itemTaxable * cgstRate) / 100;
        sgstAmount = (itemTaxable * sgstRate) / 100;
        itemTotal = itemTaxable + cgstAmount + sgstAmount;
      }

      subtotal += itemSubtotal;
      totalDiscount += discount;
      taxableAmount += itemTaxable;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;

      return {
        product: item.product?._id,
        name: item.product?.name || item.name || 'Product',
        description: item.product?.description || '',
        hsnCode: item.product?.hsnCode || '7113',
        quantity,
        unitPrice,
        discount,
        taxableAmount: itemTaxable,
        cgstRate: isGST ? cgstRate : 0,
        cgstAmount,
        sgstRate: isGST ? sgstRate : 0,
        sgstAmount,
        totalAmount: itemTotal,
      };
    });

    const totalTax = totalCGST + totalSGST;
    const grandTotalExact = taxableAmount + totalTax;
    const grandTotal = Math.round(grandTotalExact);
    const roundOff = grandTotal - grandTotalExact;

    // Create bill
    const bill = await Bill.create({
      order: order._id,
      invoiceNumber,
      invoiceDate: new Date(),
      billingType,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessGSTIN: isGST ? businessGSTIN : undefined,
      customerName: order.user?.name || order.shippingAddress?.name || 'Customer',
      customerPhone: order.user?.phone || order.shippingAddress?.phone,
      customerEmail: order.user?.email,
      customerGSTIN: isGST ? customerGSTIN : undefined,
      billingAddress: order.shippingAddress ?
        `${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}` :
        'N/A',
      items,
      subtotal,
      totalDiscount,
      taxableAmount,
      totalCGST,
      totalSGST,
      totalTax,
      roundOff,
      grandTotal,
      amountInWords: Bill.numberToWords(grandTotal),
      paymentMethod: order.paymentMethod || 'Online',
      paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      notes,
      generatedBy: req.user._id,
      termsAndConditions: [
        'Goods once sold will not be taken back or exchanged.',
        'All disputes are subject to local jurisdiction only.',
        'This is a computer generated invoice.',
        isGST ? 'E. & O.E. (Errors and Omissions Excepted)' : 'Please retain this invoice for warranty claims.',
      ],
    });

    // Generate PDF
    const populatedBill = await Bill.findById(bill._id).populate('order');
    const pdfUrl = await generatePDF(populatedBill);

    // Update bill with PDF URL
    bill.pdfUrl = pdfUrl;
    await bill.save();

    // Update order with bill reference
    order.bill = bill._id;
    await order.save();

    res.status(201).json({
      message: 'Bill generated successfully',
      bill,
    });
  } catch (error) {
    console.error('Generate bill error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get bill by order ID
// @route   GET /api/bills/order/:orderId
// @access  Private
const getBillByOrder = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      order: req.params.orderId,
      status: { $ne: 'cancelled' },
    }).populate('order');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found for this order' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('order');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all bills (admin)
// @route   GET /api/admin/bills
// @access  Private/Admin
const getAllBills = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.billingType) {
      filter.billingType = req.query.billingType;
    }

    const bills = await Bill.find(filter)
      .populate('order', 'orderId totalAmount status')
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Bill.countDocuments(filter);

    res.json({
      bills,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Get all bills error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Download bill PDF
// @route   GET /api/bills/:id/download
// @access  Private
const downloadBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (!bill.pdfUrl) {
      // Regenerate PDF if not exists
      const populatedBill = await Bill.findById(bill._id).populate('order');
      const pdfUrl = await generatePDF(populatedBill);
      bill.pdfUrl = pdfUrl;
      await bill.save();
    }

    const pdfPath = path.join(__dirname, '..', bill.pdfUrl);

    if (!fs.existsSync(pdfPath)) {
      // Regenerate PDF
      const populatedBill = await Bill.findById(bill._id).populate('order');
      await generatePDF(populatedBill);
    }

    res.download(pdfPath, `${bill.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Download bill error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Cancel bill
// @route   PUT /api/admin/bills/:id/cancel
// @access  Private/Admin
const cancelBill = async (req, res) => {
  try {
    const { reason } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    bill.status = 'cancelled';
    bill.cancelledAt = new Date();
    bill.cancelReason = reason;
    await bill.save();

    res.json({ message: 'Bill cancelled', bill });
  } catch (error) {
    console.error('Cancel bill error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Regenerate bill PDF
// @route   POST /api/admin/bills/:id/regenerate
// @access  Private/Admin
const regenerateBillPDF = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('order');
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const pdfUrl = await generatePDF(bill);
    bill.pdfUrl = pdfUrl;
    await bill.save();

    res.json({ message: 'PDF regenerated', bill });
  } catch (error) {
    console.error('Regenerate PDF error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  generateBill,
  getBillByOrder,
  getBillById,
  getAllBills,
  downloadBill,
  cancelBill,
  regenerateBillPDF,
};
