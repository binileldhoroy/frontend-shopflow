import React, { useState, useEffect, useRef } from 'react';
import { SaleOrder, SaleItem } from '../../types/sale.types';
import { useAppSelector } from '@hooks/useRedux';
import QRCode from 'react-qr-code';

interface InvoiceTemplateProps {
  saleOrder: SaleOrder;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceUrl?: string;
  customerDetails?: {
    name?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
  };
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  saleOrder,
  invoiceNumber,
  invoiceDate,
  invoiceUrl,
  customerDetails,
}) => {
  const currentCompany = useAppSelector((state) => state.company.currentCompany);

  const [measuring, setMeasuring] = useState(true);
  const [itemPages, setItemPages] = useState<SaleItem[][]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMeasuring(true);
  }, [saleOrder, customerDetails]);

  useEffect(() => {
    if (measuring && measureRef.current) {
      const fpHeader = measureRef.current.querySelector('.measure-fp-header') as HTMLElement;
      const cpHeader = measureRef.current.querySelector('.measure-cp-header') as HTMLElement;
      const tHeader = measureRef.current.querySelector('.measure-table-header') as HTMLElement;
      const summary = measureRef.current.querySelector('.measure-summary') as HTMLElement;
      const footerCont = measureRef.current.querySelector('.measure-footer-cont') as HTMLElement;
      const footerLast = measureRef.current.querySelector('.measure-footer-last') as HTMLElement;
      const rows = measureRef.current.querySelectorAll('.measure-row');

      const A4_HEIGHT = 1080;
      const SAFE_PADDING = 15;

      const heights = {
        fpHeader: (fpHeader?.offsetHeight || 0) + SAFE_PADDING,
        cpHeader: (cpHeader?.offsetHeight || 0) + SAFE_PADDING,
        tHeader: tHeader?.offsetHeight || 0,
        summary: summary?.offsetHeight || 0,
        footerCont: footerCont?.offsetHeight || 0,
        footerLast: footerLast?.offsetHeight || 0,
        rows: Array.from(rows).map(r => (r as HTMLElement).offsetHeight)
      };

      const items = saleOrder.items || [];
      const newPages: SaleItem[][] = [];
      let currentPage: SaleItem[] = [];

      let remainingHeight = A4_HEIGHT - heights.fpHeader - heights.tHeader - heights.footerCont;

      for (let i = 0; i < items.length; i++) {
        const itemHeight = heights.rows[i] || 30;
        const isLastItem = i === items.length - 1;
        const requiredSpace = itemHeight + (isLastItem ? heights.summary + heights.footerLast : 0);

        if (remainingHeight >= requiredSpace) {
          currentPage.push(items[i]);
          remainingHeight -= itemHeight;
        } else {
          if (currentPage.length > 0) {
            newPages.push(currentPage);
          }

          currentPage = [items[i]];
          remainingHeight = A4_HEIGHT - heights.cpHeader - heights.tHeader - heights.footerCont - itemHeight;

          if (isLastItem) {
             if (remainingHeight < heights.summary + heights.footerLast) {
                newPages.push(currentPage);
                currentPage = [];
             }
          }
        }
      }

      if (currentPage.length > 0 || items.length === 0) {
        newPages.push(currentPage);
      }

      setItemPages(newPages);
      setMeasuring(false);
    }
  }, [measuring, saleOrder]);

  if (!currentCompany) {
    return (
      <div className="p-5 text-center">
        <p className="text-gray-500">Please configure company settings first</p>
      </div>
    );
  }

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = [
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
      'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
    ];
    if (num === 0) return 'Zero';
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    const convertNumber = (n: number): string => {
      if (n < 1000) return convertLessThanThousand(n);
      if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertNumber(n % 1000) : '');
      if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertNumber(n % 100000) : '');
      return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertNumber(n % 10000000) : '');
    };
    return convertNumber(Math.floor(num)) + ' Rupees Only';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const taxDetails = React.useMemo(() => {
    if (!currentCompany || !saleOrder) return { taxBreakdown: {}, exemptedAmount: 0, totalGST: 0, isInterstate: false };
    const companyState = String(currentCompany.state_name || '');
    const customerState = String(customerDetails?.state || saleOrder.place_of_supply || '');
    const isInterstate = companyState && customerState
      ? companyState.toLowerCase() !== customerState.toLowerCase()
      : saleOrder.igst_amount > 0;

    const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; igst: number }> = {};
    let exemptedAmount = 0;
    let totalGST = 0;

    (saleOrder.items || []).forEach(item => {
      const lineTotal = Number(item.line_total);
      const itemGstRate = Number(item.gst_rate) ||
        (Number((item as any).cgst_rate) + Number((item as any).sgst_rate)) ||
        Number((item as any).igst_rate) || 0;

      if (itemGstRate === 0) {
        exemptedAmount += lineTotal;
      } else {
        if (!taxBreakdown[itemGstRate]) {
          taxBreakdown[itemGstRate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        const taxAmount = (lineTotal * itemGstRate) / 100;
        totalGST += taxAmount;
        taxBreakdown[itemGstRate].taxableAmount += lineTotal;
        if (isInterstate) {
          taxBreakdown[itemGstRate].igst += taxAmount;
        } else {
          taxBreakdown[itemGstRate].cgst += taxAmount / 2;
          taxBreakdown[itemGstRate].sgst += taxAmount / 2;
        }
      }
    });

    return { taxBreakdown, exemptedAmount, totalGST, isInterstate };
  }, [saleOrder, customerDetails?.state, currentCompany]);

  // Split items into pages
  const allItems = saleOrder.items || [];
  const totalPages = Math.max(1, itemPages.length);

  const upiQrValue = currentCompany.upi_id
    ? `upi://pay?pa=${currentCompany.upi_id}&pn=${encodeURIComponent(currentCompany.company_name)}&am=${saleOrder.total_amount}&cu=INR&tr=${saleOrder.order_number}`
    : null;

  // ─── Style constants ──────────────────────────────────────────────────────
  const outerBorder = '2px solid #000';
  const innerBorder = '1px solid #000';
  const lightBorder = '1px solid #ccc';
  const BASE = '11px';

  const thBase: React.CSSProperties = {
    padding: '5px 6px',
    fontSize: '10px',
    fontWeight: '700',
    textAlign: 'center' as const,
    borderRight: innerBorder,
    borderBottom: outerBorder,
    backgroundColor: '#f0f0f0',
    whiteSpace: 'nowrap' as const,
  };

  const tdBase: React.CSSProperties = {
    padding: '4px 6px',
    fontSize: BASE,
    borderRight: innerBorder,
    borderBottom: lightBorder,
    verticalAlign: 'middle' as const,
  };

  // ─── Items table ──────────────────────────────────────────────────────────
  const renderItemsTable = (items: SaleItem[], startIndex: number, isInterstate: boolean, isMeasuring = false) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead className={isMeasuring ? "measure-table-header" : ""}>
        <tr>
          <th style={{ ...thBase, width: '26px' }}>S.No</th>
          <th style={{ ...thBase, textAlign: 'left' as const }}>Description of Goods</th>
          <th style={{ ...thBase, width: '58px' }}>HSN / SAC</th>
          <th style={{ ...thBase, width: '34px' }}>GST%</th>
          <th style={{ ...thBase, width: '36px' }}>Qty</th>
          <th style={{ ...thBase, width: '32px' }}>Unit</th>
          <th style={{ ...thBase, width: '60px', textAlign: 'right' as const }}>Rate (₹)</th>
          <th style={{ ...thBase, width: '42px', textAlign: 'center' as const }}>Disc%</th>
          <th style={{ ...thBase, width: '64px', textAlign: 'right' as const }}>Taxable (₹)</th>
          {isInterstate ? (
            <th style={{ ...thBase, width: '64px', textAlign: 'right' as const }}>IGST (₹)</th>
          ) : (
            <>
              <th style={{ ...thBase, width: '60px', textAlign: 'right' as const }}>CGST (₹)</th>
              <th style={{ ...thBase, width: '60px', textAlign: 'right' as const }}>SGST (₹)</th>
            </>
          )}
          <th style={{ ...thBase, width: '72px', textAlign: 'right' as const, borderRight: 'none' }}>Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const taxable = Number(item.line_total);
          const gstAmt = Number(item.gst_amount) || (taxable * Number(item.gst_rate) / 100);
          const total = Number(item.total_with_gst) || (taxable + gstAmt);
          const discPct = Number((item as any).discount_percentage) || 0;
          return (
            <tr key={item.id} className={isMeasuring ? "measure-row" : ""}>
              <td style={{ ...tdBase, textAlign: 'center' as const }}>{startIndex + idx + 1}</td>
              <td style={{ ...tdBase, textAlign: 'left' as const }}>{item.product_name}</td>
              <td style={{ ...tdBase, textAlign: 'center' as const }}>{item.hsn_code || '-'}</td>
              <td style={{ ...tdBase, textAlign: 'center' as const }}>{item.gst_rate}%</td>
              <td style={{ ...tdBase, textAlign: 'center' as const }}>{item.quantity}</td>
              <td style={{ ...tdBase, textAlign: 'center' as const }}>{(item as any).unit || 'Nos'}</td>
              <td style={{ ...tdBase, textAlign: 'right' as const }}>{Number(item.unit_price).toFixed(2)}</td>
              <td style={{ ...tdBase, textAlign: 'center' as const, color: discPct > 0 ? '#059669' : '#aaa' }}>
                {discPct > 0 ? `${discPct}%` : '-'}
              </td>
              <td style={{ ...tdBase, textAlign: 'right' as const }}>{taxable.toFixed(2)}</td>
              {isInterstate ? (
                <td style={{ ...tdBase, textAlign: 'right' as const }}>{gstAmt.toFixed(2)}</td>
              ) : (
                <>
                  <td style={{ ...tdBase, textAlign: 'right' as const }}>{(gstAmt / 2).toFixed(2)}</td>
                  <td style={{ ...tdBase, textAlign: 'right' as const }}>{(gstAmt / 2).toFixed(2)}</td>
                </>
              )}
              <td style={{ ...tdBase, textAlign: 'right' as const, borderRight: 'none' }}>{total.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // ─── Full page-1 header ───────────────────────────────────────────────────
  const renderFullHeader = () => (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: outerBorder }}>
      {/* Company info */}
      <div style={{ flex: 1, padding: '10px 12px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '20px', margin: '0 0 4px 0', lineHeight: 1.2 }}>
          {currentCompany.company_name}
        </p>
        <p style={{ fontSize: '11px', margin: '0', lineHeight: 1.65 }}>
          {currentCompany.address_line1}
          {currentCompany.address_line2 && `, ${currentCompany.address_line2}`}<br />
          {currentCompany.city}{currentCompany.state_name ? `, ${currentCompany.state_name}` : ''}{currentCompany.pincode ? ` - ${currentCompany.pincode}` : ''}<br />
          Ph: {currentCompany.phone}
          {currentCompany.email && ` | ${currentCompany.email}`}
          {currentCompany.website && <><br />{currentCompany.website}</>}
        </p>
        <p style={{ fontSize: '11px', fontWeight: '700', margin: '5px 0 0 0' }}>
          GSTIN: {currentCompany.gstin}
        </p>
        {currentCompany.state_name && (
          <p style={{ fontSize: '10px', color: '#555', margin: '2px 0 0 0' }}>
            State Name: {currentCompany.state_name}
          </p>
        )}
      </div>

      {/* QR codes */}
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderLeft: innerBorder,
        gap: '6px',
        minWidth: upiQrValue || invoiceUrl ? '170px' : '0',
      }}>
        <p style={{ fontSize: '9px', fontWeight: '700', textAlign: 'center' as const, margin: '0', color: '#333', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
          ORIGINAL FOR RECIPIENT
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {upiQrValue && (
            <div style={{ textAlign: 'center' as const }}>
              <QRCode value={upiQrValue} size={74} />
              <p style={{ fontSize: '8px', fontWeight: '700', margin: '3px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>SCAN &amp; PAY</p>
              <p style={{ fontSize: '7px', color: '#555', margin: '1px 0 0 0' }}>UPI: {currentCompany.upi_id}</p>
            </div>
          )}
          {invoiceUrl && (
            <div style={{ textAlign: 'center' as const }}>
              <QRCode value={invoiceUrl} size={74} />
              <p style={{ fontSize: '8px', fontWeight: '700', margin: '3px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>VIEW INVOICE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Compact header for page 2+ ───────────────────────────────────────────
  const renderCompactHeader = (pageNum: number) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: outerBorder, justifyContent: 'space-between' }}>
      <div>
        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{currentCompany.company_name}</span>
        <span style={{ fontSize: '10px', color: '#555', marginLeft: '8px' }}>GSTIN: {currentCompany.gstin}</span>
      </div>
      <div style={{ textAlign: 'right' as const, fontSize: '10px' }}>
        <span style={{ fontWeight: '700' }}>Invoice No:</span> {invoiceNumber || 'PREVIEW'}
        <span style={{ marginLeft: '10px', fontWeight: '700' }}>Date:</span>{' '}
        {invoiceDate ? formatDate(invoiceDate) : formatDate(new Date().toISOString())}
        <span style={{ marginLeft: '10px', color: '#666', fontWeight: '600' }}>
          Page {pageNum} of {totalPages}
        </span>
      </div>
    </div>
  );

  // ─── TAX INVOICE title bar ─────────────────────────────────────────────────
  const renderTitle = () => (
    <div style={{ textAlign: 'center' as const, padding: '6px', borderBottom: outerBorder, backgroundColor: '#fafafa' }}>
      <span style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '3px' }}>TAX INVOICE</span>
    </div>
  );

  // ─── Bill To + Invoice details ────────────────────────────────────────────
  const renderBillToSection = () => (
    <div style={{ display: 'flex', borderBottom: outerBorder }}>
      {/* Bill To */}
      <div style={{ flex: 3, padding: '8px 10px', borderRight: innerBorder }}>
        <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 5px 0', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>Bill To:</p>
        <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 4px 0' }}>
          {customerDetails?.name || saleOrder.customer_name || 'Walk-in Customer'}
        </p>
        {customerDetails?.gstin && (
          <p style={{ fontSize: BASE, margin: '2px 0' }}>
            <span style={{ fontWeight: '600' }}>GSTIN:</span> {customerDetails.gstin}
          </p>
        )}
        {customerDetails?.address && (
          <p style={{ fontSize: BASE, margin: '2px 0' }}>{customerDetails.address}</p>
        )}
        {(customerDetails?.city || customerDetails?.state || customerDetails?.pincode) && (
          <p style={{ fontSize: BASE, margin: '2px 0' }}>
            {[customerDetails?.city, customerDetails?.state, customerDetails?.pincode].filter(Boolean).join(', ')}
          </p>
        )}
        {customerDetails?.phone && (
          <p style={{ fontSize: BASE, margin: '2px 0' }}>
            <span style={{ fontWeight: '600' }}>Ph:</span> {customerDetails.phone}
          </p>
        )}
        {customerDetails?.email && (
          <p style={{ fontSize: BASE, margin: '2px 0' }}>
            <span style={{ fontWeight: '600' }}>Email:</span> {customerDetails.email}
          </p>
        )}
        <p style={{ fontSize: BASE, margin: '6px 0 0 0', paddingTop: '4px', borderTop: lightBorder }}>
          <span style={{ fontWeight: '600' }}>Place of Supply:</span>{' '}
          {customerDetails?.state || saleOrder.place_of_supply || currentCompany.state_name || ''}
        </p>
      </div>

      {/* Invoice details */}
      <div style={{ flex: 2, padding: '8px 10px' }}>
        <table style={{ width: '100%', fontSize: BASE, borderCollapse: 'collapse' as const }}>
          <tbody>
            {[
              ['Invoice No:', invoiceNumber || 'PREVIEW'],
              ['Invoice Date:', invoiceDate ? formatDate(invoiceDate) : formatDate(new Date().toISOString())],
              ['Order No:', saleOrder.order_number],
              ['Order Date:', formatDate(saleOrder.sale_date)],
              ['Payment Mode:', saleOrder.payment_method?.replace(/_/g, ' ') || '-'],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ fontWeight: '600', padding: '3px 0', width: '45%', color: '#333' }}>{label}</td>
                <td style={{ padding: '3px 0', textAlign: 'right' as const }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Tax summary + totals (last page only) ────────────────────────────────
  const renderSummarySection = () => (
    <>
      {/* Tax summary + totals side by side */}
      <div style={{ display: 'flex', borderBottom: outerBorder }}>
        {/* Left: Tax class table */}
        <div style={{ flex: 1, padding: '8px 10px', borderRight: innerBorder }}>
          <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 6px 0', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
            Tax Summary
          </p>
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' as const, border: innerBorder }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: innerBorder, fontWeight: '700', textAlign: 'center' as const }}>GST%</th>
                <th style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: innerBorder, fontWeight: '700', textAlign: 'right' as const }}>Taxable (₹)</th>
                {taxDetails.isInterstate ? (
                  <th style={{ padding: '3px 5px', borderBottom: innerBorder, fontWeight: '700', textAlign: 'right' as const }}>IGST (₹)</th>
                ) : (
                  <>
                    <th style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: innerBorder, fontWeight: '700', textAlign: 'right' as const }}>CGST (₹)</th>
                    <th style={{ padding: '3px 5px', borderBottom: innerBorder, fontWeight: '700', textAlign: 'right' as const }}>SGST (₹)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.entries(taxDetails.taxBreakdown).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, bd]) => (
                <tr key={rate}>
                  <td style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: lightBorder, textAlign: 'center' as const }}>{rate}%</td>
                  <td style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: lightBorder, textAlign: 'right' as const }}>{bd.taxableAmount.toFixed(2)}</td>
                  {taxDetails.isInterstate ? (
                    <td style={{ padding: '3px 5px', borderBottom: lightBorder, textAlign: 'right' as const }}>
                      {bd.igst.toFixed(2)}<span style={{ fontSize: '8px', color: '#777' }}> @{rate}%</span>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '3px 5px', borderRight: innerBorder, borderBottom: lightBorder, textAlign: 'right' as const }}>
                        {bd.cgst.toFixed(2)}<span style={{ fontSize: '8px', color: '#777' }}> @{Number(rate) / 2}%</span>
                      </td>
                      <td style={{ padding: '3px 5px', borderBottom: lightBorder, textAlign: 'right' as const }}>
                        {bd.sgst.toFixed(2)}<span style={{ fontSize: '8px', color: '#777' }}> @{Number(rate) / 2}%</span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {taxDetails.exemptedAmount > 0 && (
                <tr>
                  <td style={{ padding: '3px 5px', borderRight: innerBorder, textAlign: 'center' as const }}>0%</td>
                  <td style={{ padding: '3px 5px', borderRight: innerBorder, textAlign: 'right' as const }}>{taxDetails.exemptedAmount.toFixed(2)}</td>
                  {taxDetails.isInterstate ? (
                    <td style={{ padding: '3px 5px', textAlign: 'right' as const }}>0.00</td>
                  ) : (
                    <>
                      <td style={{ padding: '3px 5px', borderRight: innerBorder, textAlign: 'right' as const }}>0.00</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right' as const }}>0.00</td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Totals */}
        <div style={{ flex: 1, padding: '8px 10px' }}>
          <table style={{ width: '100%', fontSize: BASE, borderCollapse: 'collapse' as const }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>Subtotal (before GST):</td>
                <td style={{ padding: '3px 0', textAlign: 'right' as const }}>₹{Number(saleOrder.subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>Total GST:</td>
                <td style={{ padding: '3px 0', textAlign: 'right' as const }}>₹{taxDetails.totalGST.toFixed(2)}</td>
              </tr>
              {saleOrder.discount_amount > 0 && (
                <tr>
                  <td style={{ padding: '3px 0' }}>Discount ({saleOrder.discount_percentage}%):</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' as const, color: '#059669' }}>
                    -₹{Number(saleOrder.discount_amount).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '3px 0' }}>Actual Amount:</td>
                <td style={{ padding: '3px 0', textAlign: 'right' as const }}>
                  ₹{(Number(saleOrder.subtotal) + taxDetails.totalGST - Number(saleOrder.discount_amount)).toFixed(2)}
                </td>
              </tr>
              {saleOrder.round_off !== 0 && (
                <tr>
                  <td style={{ padding: '3px 0' }}>Round Off:</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' as const }}>
                    {Number(saleOrder.round_off) > 0 ? '+' : ''}₹{Number(saleOrder.round_off).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr style={{ borderTop: '1.5px solid #000' }}>
                <td style={{ padding: '7px 0 3px', fontWeight: 'bold', fontSize: '15px' }}>Grand Total:</td>
                <td style={{ padding: '7px 0 3px', textAlign: 'right' as const, fontWeight: 'bold', fontSize: '15px' }}>
                  ₹{Math.round(saleOrder.total_amount).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ padding: '6px 10px', borderBottom: outerBorder, backgroundColor: '#fafafa' }}>
        <span style={{ fontWeight: '700', fontSize: BASE }}>Grand Total in Words: </span>
        <span style={{ fontStyle: 'italic', fontSize: BASE }}>{numberToWords(Math.round(saleOrder.total_amount))}</span>
      </div>

      {/* Declaration */}
      <div style={{ padding: '5px 10px', borderBottom: outerBorder, fontSize: '10px', color: '#444' }}>
        <span style={{ fontWeight: '700' }}>Declaration: </span>
        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
      </div>

      {/* Bank Details + Terms */}
      <div style={{ display: 'flex', borderBottom: outerBorder }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRight: innerBorder }}>
          <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 6px 0', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
            Company's Bank Details
          </p>
          <table style={{ fontSize: BASE, width: '100%', borderCollapse: 'collapse' as const }}>
            <tbody>
              {[
                ['Bank Name', currentCompany.bank_name || '-'],
                ['A/c No', currentCompany.account_number || '-'],
                ['IFSC Code', currentCompany.ifsc_code || '-'],
                ['Branch', currentCompany.branch || '-'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '2px 0', color: '#555', width: '38%' }}>{label}:</td>
                  <td style={{ fontWeight: '500' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1, padding: '8px 10px' }}>
          <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 6px 0', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.8px' }}>
            Terms &amp; Conditions
          </p>
          <p style={{ fontSize: '10px', whiteSpace: 'pre-line' as const, margin: 0, lineHeight: 1.6 }}>
            {currentCompany.terms_and_conditions || 'Thank you for your business!'}
          </p>
        </div>
      </div>

      {/* Signature + UPI QR */}
      <div style={{ display: 'flex', padding: '10px 12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          {upiQrValue && (
            <div style={{ display: 'inline-block', textAlign: 'center' as const }}>
              <QRCode value={upiQrValue} size={72} />
              <p style={{ margin: '4px 0 0', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Scan to Pay via UPI
              </p>
              <p style={{ margin: '1px 0 0', fontSize: '8px', color: '#555' }}>UPI: {currentCompany.upi_id}</p>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <p style={{ fontWeight: '700', margin: '0 0 52px', fontSize: BASE }}>For {currentCompany.company_name}</p>
          <p style={{
            display: 'inline-block',
            borderTop: '1.5px solid #000',
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '4px',
            margin: '0 0 2px',
            fontSize: BASE,
            fontWeight: '600',
          }}>
            Authorised Signatory
          </p>
          {currentCompany.authorized_signatory_name && (
            <p style={{ fontSize: BASE, margin: 0 }}>{currentCompany.authorized_signatory_name}</p>
          )}
        </div>
      </div>
    </>
  );

  // ─── Page footer ──────────────────────────────────────────────────────────
  const renderContinuedFooter = (pageNum: number) => (
    <div style={{
      padding: '5px 10px',
      borderTop: innerBorder,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#fafafa',
    }}>
      <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#666' }}>
        This is a computer-generated invoice
      </span>
      <span style={{ fontSize: '10px', fontWeight: '700' }}>
        Continued on page {pageNum + 1} of {totalPages}...
      </span>
    </div>
  );

  const renderLastPageFooter = () => (
    <div style={{ textAlign: 'center' as const, padding: '5px', borderTop: lightBorder, fontSize: '9px', color: '#888' }}>
      This is a computer-generated invoice and does not require a physical signature.
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (measuring) {
    return (
      <div style={{ position: 'fixed', top: -10000, left: -10000, width: '210mm', background: 'white', visibility: 'hidden' }}>
        <div ref={measureRef} style={{ width: '100%', fontFamily: 'Arial, sans-serif', fontSize: BASE }}>
          <div className="measure-fp-header">{renderFullHeader()}{renderTitle()}{renderBillToSection()}</div>
          <div className="measure-cp-header">{renderCompactHeader(2)}</div>
          {renderItemsTable(allItems, 0, taxDetails.isInterstate, true)}
          <div className="measure-summary">{renderSummarySection()}</div>
          <div className="measure-footer-cont">{renderContinuedFooter(1)}</div>
          <div className="measure-footer-last">{renderLastPageFooter()}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Screen: gap between pages */
        .invoice-page + .invoice-page { margin-top: 16px; }

        @media print {
          /* Zero browser margin — our content div handles its own sizing */
          @page { size: A4; margin: 10mm; }

          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .invoice-outer-wrapper { background: white !important; }

          /* Each div = exactly one A4 page */
          .invoice-page {
            width:  210mm !important;
            height: 297mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .invoice-page:last-child { page-break-after: auto !important; }

          /* Inner wrapper must also be full height in print */
          .invoice-page-inner { height: 100% !important; }
        }
      `}</style>

      <div className="invoice-outer-wrapper" style={{ fontFamily: 'Arial, sans-serif', fontSize: BASE, backgroundColor: '#e5e7eb' }}>
        {itemPages.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;
          const startItemIndex = itemPages.slice(0, pageIndex).reduce((acc, p) => acc + p.length, 0);

          return (
            <div
              key={pageIndex}
              className="invoice-page"
              style={{
                width: '210mm',
                height: '297mm',
                margin: '0 auto',
                boxSizing: 'border-box' as const,
                fontFamily: 'Arial, sans-serif',
                fontSize: BASE,
                backgroundColor: 'white',
                overflow: 'hidden',
              }}
            >
              {/*
               * Inner border wrapper — flex column so:
               *   • fixed sections (header, bill-to) stay at the top
               *   • items area (flex:1) fills all remaining space
               *   • footer/summary stays at the bottom
               * This makes every page — even one with a single item —
               * look like a complete, professional A4 page.
               */}
              <div
                className="invoice-page-inner"
                style={{
                  border: outerBorder,
                  height: '100%',
                  boxSizing: 'border-box' as const,
                  display: 'flex',
                  flexDirection: 'column' as const,
                }}
              >
                {/* ── Top fixed section ── */}
                <div style={{ flexShrink: 0 }}>
                  {isFirstPage ? renderFullHeader() : renderCompactHeader(pageIndex + 1)}
                  {isFirstPage && renderTitle()}
                  {isFirstPage && renderBillToSection()}
                  {!isFirstPage && (
                    <div style={{
                      padding: '4px 10px',
                      borderBottom: innerBorder,
                      backgroundColor: '#f0f0f0',
                      fontSize: '10px',
                      fontStyle: 'italic',
                      color: '#555',
                      textAlign: 'center' as const,
                      fontWeight: '600',
                    }}>
                      TAX INVOICE (Continued) — Page {pageIndex + 1} of {totalPages}
                    </div>
                  )}
                </div>

                {/* ── Items area — grows to fill remaining space ── */}
                <div style={{ flex: 1, overflow: 'hidden', borderBottom: outerBorder, }}>
                  {renderItemsTable(pageItems, startItemIndex, taxDetails.isInterstate)}
                </div>

                {/* ── Bottom section — summary on last page, footer on others ── */}
                <div style={{ flexShrink: 0 }}>
                  {isLastPage ? renderSummarySection() : renderContinuedFooter(pageIndex + 1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default InvoiceTemplate;
