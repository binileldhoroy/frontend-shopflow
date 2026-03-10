import React from 'react';
import { SaleOrder } from '../../types/sale.types';
import { useAppSelector } from '@hooks/useRedux';
import QRCode from 'react-qr-code';

interface InvoiceTemplateProps {
  saleOrder: SaleOrder;
  invoiceNumber?: string;
  invoiceDate?: string;
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
  customerDetails,
}) => {
  const currentCompany = useAppSelector((state) => state.company.currentCompany);

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
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return (
        ones[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
      );
    };

    const convertNumber = (n: number): string => {
      if (n < 1000) return convertLessThanThousand(n);
      if (n < 100000)
        return (
          convertLessThanThousand(Math.floor(n / 1000)) +
          ' Thousand' +
          (n % 1000 !== 0 ? ' ' + convertNumber(n % 1000) : '')
        );
      if (n < 10000000)
        return (
          convertLessThanThousand(Math.floor(n / 100000)) +
          ' Lakh' +
          (n % 100000 !== 0 ? ' ' + convertNumber(n % 100000) : '')
        );
      return (
        convertLessThanThousand(Math.floor(n / 10000000)) +
        ' Crore' +
        (n % 10000000 !== 0 ? ' ' + convertNumber(n % 10000000) : '')
      );
    };

    return convertNumber(Math.floor(num)) + ' Rupees Only';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Calculate taxes dynamically based on preview state
  const taxDetails = React.useMemo(() => {
    if (!currentCompany || !saleOrder) return {
      taxBreakdown: {},
      exemptedAmount: 0,
      totalGST: 0,
      isInterstate: false
    };

    // Determine state for tax calculation
    const companyState = currentCompany.state_name || '';
    const customerState = customerDetails?.state || saleOrder.place_of_supply || '';

    let isInterstate = false;

    if (companyState && customerState) {
      isInterstate = companyState.toLowerCase() !== customerState.toLowerCase();
    } else {
      isInterstate = saleOrder.igst_amount > 0;
    }

    const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; igst: number }> = {};
    let exemptedAmount = 0;
    let totalGST = 0;

    if (saleOrder.items && saleOrder.items.length > 0) {
      saleOrder.items.forEach(item => {
        const lineTotal = Number(item.line_total); // Taxable value
        // Use the GST rate from the item. If strictly IGST was stored, we might need to be careful,
        // but usually gst_rate holds the total tax percent.
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
    }

    return {
      taxBreakdown,
      exemptedAmount,
      totalGST,
      isInterstate
    };
  }, [saleOrder, customerDetails?.state, currentCompany]);

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
            }
            #invoice-print-container {
              width: 100%;
              box-sizing: border-box;
            }
          }
        `}
      </style>
    <div
      id="invoice-print-container"
      style={{
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '16px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        backgroundColor: 'white',
      }}
    >
      {/* Main Border */}
      <div style={{ border: '2px solid black' }}>
        {/* Company Header */}
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            borderBottom: '2px solid black',
          }}
        >
          <h1 style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '24px', margin: 0 }}>
            {currentCompany.company_name}
          </h1>
          <p style={{ marginBottom: 0, fontSize: '13px', lineHeight: '1.5' }}>
            {currentCompany.address_line1}
            {currentCompany.address_line2 && `, ${currentCompany.address_line2}`}
            <br />
            {currentCompany.city}, {currentCompany.state_name || ''} - {currentCompany.pincode}
            <br />
            Phone: {currentCompany.phone} | Email: {currentCompany.email}
            {currentCompany.website && <> | {currentCompany.website}</>}
          </p>
          <p style={{ fontWeight: '600', marginTop: '4px', marginBottom: 0, fontSize: '13px' }}>
            GSTIN: {currentCompany.gstin}
          </p>
        </div>

        {/* Tax Invoice Title */}
        <div
          style={{
            textAlign: 'center',
            padding: '8px',
            backgroundColor: '#ffffffff',
            borderBottom: '2px solid black',
          }}
        >
          <h2 style={{ fontWeight: 'bold', marginBottom: 0, fontSize: '20px', margin: 0 }}>
            TAX INVOICE
          </h2>
        </div>

        {/* Invoice Details & Customer Details */}
        <div style={{ display: 'flex', borderBottom: '2px solid black' }}>
          {/* Left: Customer Details */}
          <div style={{ flex: 1, padding: '12px', borderRight: '2px solid black' }}>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Bill To:</p>
            <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {customerDetails?.name || saleOrder.customer_name || 'Walk-in Customer'}
            </p>
            {customerDetails?.gstin && (
              <p style={{ marginBottom: '4px', fontSize: '13px' }}>
                <span style={{ fontWeight: '600' }}>GSTIN:</span> {customerDetails.gstin}
              </p>
            )}
            {customerDetails?.address && (
              <p style={{ marginBottom: '4px', fontSize: '13px' }}>
                {customerDetails.address}
              </p>
            )}
            {(customerDetails?.city || customerDetails?.state || customerDetails?.pincode) && (
              <p style={{ marginBottom: '4px', fontSize: '13px' }}>
                {[customerDetails?.city, customerDetails?.state, customerDetails?.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {customerDetails?.phone && (
              <p style={{ marginBottom: '4px', fontSize: '13px' }}>
                <span style={{ fontWeight: '600' }}>Phone:</span> {customerDetails.phone}
              </p>
            )}
            {customerDetails?.email && (
              <p style={{ marginBottom: '4px', fontSize: '13px' }}>
                <span style={{ fontWeight: '600' }}>Email:</span> {customerDetails.email}
              </p>
            )}
            <p style={{ marginBottom: 0, marginTop: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: '600' }}>Place of Supply:</span>{' '}
              {customerDetails?.state || saleOrder.place_of_supply || currentCompany.state_name || ''}
            </p>
          </div>

          {/* Right: Invoice Details */}
          <div style={{ flex: 1, padding: '12px' }}>
            <table style={{ width: '100%', fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '600', paddingTop: '4px', paddingBottom: '4px' }}>Invoice No:</td>
                  <td style={{ textAlign: 'right' }}>{invoiceNumber || 'PREVIEW'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', paddingTop: '4px', paddingBottom: '4px' }}>Invoice Date:</td>
                  <td style={{ textAlign: 'right' }}>
                    {invoiceDate ? formatDate(invoiceDate) : formatDate(new Date().toISOString())}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', paddingTop: '4px', paddingBottom: '4px' }}>Order No:</td>
                  <td style={{ textAlign: 'right' }}>{saleOrder.order_number}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', paddingTop: '4px', paddingBottom: '4px' }}>Order Date:</td>
                  <td style={{ textAlign: 'right' }}>{formatDate(saleOrder.sale_date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid black', backgroundColor: '#ffffffff' }}>
              <th style={{ padding: '8px', textAlign: 'left', width: '50px', borderRight: '1px solid black' }}>
                S.No
              </th>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid black' }}>
                Description of Goods
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '100px', borderRight: '1px solid black' }}>
                HSN/SAC
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '60px', borderRight: '1px solid black' }}>
                Tax
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '60px', borderRight: '1px solid black' }}>
                Qty
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '60px', borderRight: '1px solid black' }}>
                Unit
              </th>
              <th style={{ padding: '8px', textAlign: 'right', width: '100px', borderRight: '1px solid black' }}>
                Rate
              </th>
              <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {saleOrder.items?.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid black' }}>
                <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>
                  {index + 1}
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid black' }}>
                  {item.product_name}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>
                  {item.hsn_code || '-'}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>
                  {item.gst_rate}%
                </td>
                <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>
                  {(item as any).unit || 'Nos'}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid black' }}>
                  ₹{Number(item.unit_price).toFixed(2)}
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  ₹{Number(item.line_total).toFixed(2)}
                </td>
              </tr>
            ))}

            {/* Spacer rows */}
            {saleOrder.items && saleOrder.items.length < 5 &&
              Array.from({ length: 2 - saleOrder.items.length }).map((_, i) => (
                <tr key={`spacer-${i}`} style={{ borderBottom: '1px solid black' }}>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                  <td style={{ padding: '8px', borderRight: '1px solid black' }}>&nbsp;</td>
                </tr>
              ))}

            {/* Totals Section */}
            <tr style={{ borderBottom: '1px solid black' }}>
              <td
                colSpan={7}
                style={{ padding: '8px', textAlign: 'right', fontWeight: '600', borderRight: '1px solid black' }}
              >
                Subtotal:
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                ₹{Number(saleOrder.subtotal).toFixed(2)}
              </td>
            </tr>

            {/* GST Breakdown */}
            {Object.entries(taxDetails.taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
               <React.Fragment key={rate}>
                 <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                   <td colSpan={7} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid black', fontSize: '12px' }}>
                     Taxable Amount ({rate}%):
                   </td>
                   <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '12px' }}>
                     ₹{breakdown.taxableAmount.toFixed(2)}
                   </td>
                 </tr>
                 {taxDetails.isInterstate ? (
                   <tr style={{ borderBottom: '1px solid black' }}>
                     <td colSpan={7} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid black', fontSize: '11px', color: '#4b5563' }}>
                       IGST @ {rate}%:
                     </td>
                     <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '11px', color: '#4b5563' }}>
                       ₹{breakdown.igst.toFixed(2)}
                     </td>
                   </tr>
                 ) : (
                   <>
                     <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                       <td colSpan={7} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid black', fontSize: '11px', color: '#4b5563' }}>
                         CGST @ {Number(rate)/2}%:
                       </td>
                       <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '11px', color: '#4b5563' }}>
                         ₹{breakdown.cgst.toFixed(2)}
                       </td>
                     </tr>
                     <tr style={{ borderBottom: '1px solid black' }}>
                       <td colSpan={7} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid black', fontSize: '11px', color: '#4b5563' }}>
                         SGST @ {Number(rate)/2}%:
                       </td>
                       <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '11px', color: '#4b5563' }}>
                         ₹{breakdown.sgst.toFixed(2)}
                       </td>
                     </tr>
                   </>
                 )}
               </React.Fragment>
            ))}

            {taxDetails.exemptedAmount > 0 && (
              <tr style={{ borderBottom: '1px solid black' }}>
                <td colSpan={7} style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid black' }}>
                  Exempted Amount (0%):
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  ₹{taxDetails.exemptedAmount.toFixed(2)}
                </td>
              </tr>
            )}

            <tr style={{ borderBottom: '1px solid black' }}>
              <td colSpan={7} style={{ padding: '8px', textAlign: 'right', fontWeight: '600', borderRight: '1px solid black' }}>
                Total GST:
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                ₹{taxDetails.totalGST.toFixed(2)}
              </td>
            </tr>

            {saleOrder.discount_amount > 0 && (
              <tr style={{ borderBottom: '1px solid black' }}>
                <td colSpan={7} style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid black' }}>
                  Discount ({saleOrder.discount_percentage}%):
                </td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                  -₹{Number(saleOrder.discount_amount).toFixed(2)}
                </td>
              </tr>
            )}

            {saleOrder.round_off !== 0 && (
              <tr style={{ borderBottom: '1px solid black' }}>
                <td colSpan={7} style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid black' }}>
                  Round Off:
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {Number(saleOrder.round_off) > 0 ? '+' : ''}₹{Number(saleOrder.round_off).toFixed(2)}
                </td>
              </tr>
            )}

            <tr style={{ borderBottom: '2px solid black', backgroundColor: '#ffffffff' }}>
              <td
                colSpan={7}
                style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', borderRight: '1px solid black' }}
              >
                Grand Total:
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                ₹{Math.round(saleOrder.total_amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div style={{ padding: '12px', borderBottom: '2px solid black' }}>
          <p style={{ fontWeight: '600', marginBottom: '4px' }}>Amount in Words:</p>
          <p style={{ fontStyle: 'italic', marginBottom: 0 }}>{numberToWords(saleOrder.total_amount)}</p>
        </div>

        {/* Bank Details & Terms */}
        <div style={{ display: 'flex', borderBottom: '2px solid black' }}>
          <div style={{ flex: 1, padding: '12px', borderRight: '2px solid black' }}>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Bank Details:</p>
            <table style={{ fontSize: '13px', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>Bank Name:</td>
                  <td style={{ fontWeight: '500' }}>{currentCompany.bank_name || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>A/c No:</td>
                  <td style={{ fontWeight: '500' }}>{currentCompany.account_number || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>IFSC Code:</td>
                  <td style={{ fontWeight: '500' }}>{currentCompany.ifsc_code || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>Branch:</td>
                  <td style={{ fontWeight: '500' }}>{currentCompany.branch || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ flex: 1, padding: '12px' }}>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Terms & Conditions:</p>
            <p style={{ fontSize: '12px', whiteSpace: 'pre-line', marginBottom: 0 }}>
              {currentCompany.terms_and_conditions || 'Thank you for your business!'}
            </p>
          </div>
        </div>

        {/* Signature & QR Code */}
        <div style={{ display: 'flex', padding: '16px' }}>
          <div style={{ flex: 1, textAlign: 'left' }}>
            {currentCompany.upi_id ? (
              <div style={{ display: 'inline-block', textAlign: 'center' }}>
                 <QRCode
                    value={`upi://pay?pa=${currentCompany.upi_id}&pn=${encodeURIComponent(currentCompany.company_name)}&am=${saleOrder.total_amount}&cu=INR&tr=${saleOrder.order_number}`}
                    size={80}
                 />
                 <p style={{ marginTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>Scan to Pay via UPI</p>
              </div>
            ) : null}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontWeight: '600', marginBottom: '60px' }}>For {currentCompany.company_name}</p>
            <p style={{ display: 'inline-block', borderTop: '1px solid black', paddingLeft: '16px', paddingRight: '16px', paddingTop: '4px', marginBottom: '4px' }}>
              Authorized Signatory
            </p>
            <p style={{ fontSize: '13px', marginBottom: 0 }}>
              {currentCompany.authorized_signatory_name || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#6c757d' }}>
        <p style={{ marginBottom: 0 }}>
          This is a computer-generated invoice and does not require a physical signature
        </p>
      </div>
    </div>
    </>
  );
};

export default InvoiceTemplate;
