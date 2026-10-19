import React, { useState, useMemo, useEffect, useRef } from 'react';
import { convertNumberToWordsIndian } from '../utils/numToWordsIndian';

export default function BillingSheet({
  billType = 'normal', // 'normal' | 'gst' | 'corecutting' | 'challan'
  companyDetails = {},
  initialBillNo = 1,
  products = [], // Array<{ name: string, unit: string, price: number }>
  onSave,
  onPreview,
  onSelectCustomer,
  onSelectBank,
  onBack,
}) {
  const isGst = billType === 'gst';

  // Form Metadata
  const [billNo, setBillNo] = useState(initialBillNo);
  const [allowEditBillNo, setAllowEditBillNo] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toAddress, setToAddress] = useState('');
  const [site, setSite] = useState('');

  // Tax rates
  const [sgstPercent, setSgstPercent] = useState(9);
  const [cgstPercent, setCgstPercent] = useState(9);

  // Line Items & Table State
  const [items, setItems] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [countSr, setCountSr] = useState(true);
  const [roundTotal, setRoundTotal] = useState(false);

  // Current Item Input Line
  const [inputParticular, setInputParticular] = useState('');
  const [inputNotes, setInputNotes] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [inputRate, setInputRate] = useState('');

  // Autocomplete Dropdown State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  // Synchronize incoming bill number
  useEffect(() => {
    setBillNo(initialBillNo);
  }, [initialBillNo]);

  // Product Autocomplete logic
  const handleParticularChange = (e) => {
    const text = e.target.value;
    setInputParticular(text);
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(text.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelectSuggestion = (prod) => {
    setInputParticular(prod.name);
    setInputQty('1');
    setInputUnit(prod.unit || '');
    setInputRate(prod.price != null ? String(prod.price) : '');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Add Item to List
  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!inputParticular.trim()) {
      alert('Please enter or select a product name.');
      return;
    }

    const qty = parseFloat(inputQty) || 0;
    const rate = parseFloat(inputRate) || 0;
    const amount = (qty * rate).toFixed(2);
    const displayName = inputNotes.trim()
      ? `${inputParticular.trim()} (${inputNotes.trim()})`
      : inputParticular.trim();

    const numberedCount = items.filter((row) => row.sr !== '').length;

    const newItem = {
      sr: numberedCount + 1,
      particular: displayName,
      qty: qty % 1 !== 0 ? String(qty) : String(Math.floor(qty)),
      unit: inputUnit.trim(),
      rate: rate % 1 !== 0 ? rate.toFixed(2) : String(Math.floor(rate)),
      amount: parseFloat(amount) % 1 === 0 ? String(Math.floor(amount)) : amount,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset Input fields
    setInputParticular('');
    setInputNotes('');
    setInputQty('');
    setInputUnit('');
    setInputRate('');
    setShowSuggestions(false);
  };

  // Row Manipulation Tools
  const handleDeleteLine = () => {
    if (selectedRowIndex === null) {
      alert('Please select a row to delete.');
      return;
    }
    const updated = items.filter((_, idx) => idx !== selectedRowIndex);
    recalculateSerialNumbers(updated);
    setSelectedRowIndex(null);
  };

  const handleInsertManualRow = () => {
    const text = prompt('Enter text for this manual row:');
    if (text === null) return;

    const numberedCount = items.filter((row) => row.sr !== '').length;
    const newRow = {
      sr: countSr ? numberedCount + 1 : '',
      particular: text,
      qty: '',
      unit: '',
      rate: '',
      amount: '',
    };

    const targetIdx = selectedRowIndex !== null ? selectedRowIndex : items.length;
    const nextItems = [...items];
    nextItems.splice(targetIdx, 0, newRow);
    recalculateSerialNumbers(nextItems);
  };

  const handleMoveRow = (direction) => {
    if (selectedRowIndex === null) {
      alert('Please select a row to move.');
      return;
    }
    const newIdx = selectedRowIndex + direction;
    if (newIdx < 0 || newIdx >= items.length) return;

    const nextItems = [...items];
    const temp = nextItems[selectedRowIndex];
    nextItems[selectedRowIndex] = nextItems[newIdx];
    nextItems[newIdx] = temp;

    recalculateSerialNumbers(nextItems);
    setSelectedRowIndex(newIdx);
  };

  const recalculateSerialNumbers = (list) => {
    let currentSr = 1;
    const reindexed = list.map((item) => {
      if (item.sr !== '') {
        const rowWithSr = { ...item, sr: currentSr };
        currentSr += 1;
        return rowWithSr;
      }
      return item;
    });
    setItems(reindexed);
  };

  const handleCellChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(updated[index].qty) || 0;
      const r = parseFloat(updated[index].rate) || 0;
      const calculated = q * r;
      updated[index].amount =
        calculated % 1 === 0 ? String(Math.floor(calculated)) : calculated.toFixed(2);
    }
    setItems(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all rows?')) {
      setItems([]);
      setSelectedRowIndex(null);
    }
  };

  // Computations
  const subTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const val = parseFloat(item.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [items]);

  const sgstAmount = useMemo(() => (subTotal * (parseFloat(sgstPercent) || 0)) / 100, [subTotal, sgstPercent]);
  const cgstAmount = useMemo(() => (subTotal * (parseFloat(cgstPercent) || 0)) / 100, [subTotal, cgstPercent]);

  const rawGrandTotal = isGst ? subTotal + sgstAmount + cgstAmount : subTotal;
  const grandTotal = roundTotal ? Math.round(rawGrandTotal) : rawGrandTotal;
  const amountInWords = useMemo(() => convertNumberToWordsIndian(grandTotal), [grandTotal]);

  const getPayload = () => ({
    billType,
    company: companyDetails,
    billNo,
    date,
    to: toAddress,
    site,
    items,
    subTotal,
    ...(isGst && {
      sgstPercent,
      cgstPercent,
      sgstAmount,
      cgstAmount,
    }),
    grandTotal,
    amountInWords,
    roundTotal,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header Banner */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
            🧾 {billType} Bill - {companyDetails.name || 'Company Name'}
          </h1>
          {isGst && (
            <div className="text-xs text-gray-600 mt-1 grid grid-cols-2 gap-x-4">
              <p>GSTIN: <span className="font-semibold">{companyDetails.gstNo || 'N/A'}</span></p>
              <p>Bank: <span className="font-semibold">{companyDetails.bankName || 'N/A'}</span></p>
              <p>Acc No: <span className="font-semibold">{companyDetails.accNo || 'N/A'}</span></p>
              <p>IFSC: <span className="font-semibold">{companyDetails.ifsc || 'N/A'}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Meta Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4 p-4 bg-gray-50 rounded border">
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold text-gray-700">To:</label>
            {onSelectCustomer && (
              <button
                type="button"
                onClick={() => onSelectCustomer((to, st) => { setToAddress(to); setSite(st); })}
                className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-0.5 rounded"
              >
                📂 Select Customer
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="w-full text-sm p-2 border rounded resize-none focus:outline-blue-500"
            placeholder="Customer name and address..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Site:</label>
          <textarea
            rows={2}
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="w-full text-sm p-2 border rounded resize-none focus:outline-blue-500"
            placeholder="Delivery site location..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Bill No:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly={!allowEditBillNo}
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              className={`w-full text-sm p-1.5 border rounded ${
                !allowEditBillNo ? 'bg-gray-100' : 'bg-white border-blue-400'
              }`}
            />
            <label className="text-xs flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEditBillNo}
                onChange={(e) => setAllowEditBillNo(e.target.checked)}
              />
              Edit
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
          />
        </div>

        {isGst && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">SGST (%):</label>
              <input
                type="number"
                value={sgstPercent}
                onChange={(e) => setSgstPercent(e.target.value)}
                className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">CGST (%):</label>
              <input
                type="number"
                value={cgstPercent}
                onChange={(e) => setCgstPercent(e.target.value)}
                className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Item Input Box */}
      <form onSubmit={handleAddItem} className="p-4 bg-gray-50 border rounded-lg mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-2">Add Item</h2>
        <div className="grid grid-cols-12 gap-2 relative" ref={dropdownRef}>
          <div className="col-span-12 sm:col-span-4 relative">
            <label className="block text-xs font-semibold text-gray-600 mb-0.5">Particular</label>
            <input
              type="text"
              value={inputParticular}
              onChange={handleParticularChange}
              placeholder="Search or enter item..."
              className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
            />
            {showSuggestions && (
              <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                {suggestions.map((p, i) => (
                  <li
                    key={i}
                    onClick={() => handleSelectSuggestion(p)}
                    className="p-2 text-xs hover:bg-blue-600 hover:text-white cursor-pointer"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="col-span-12 sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-0.5">Notes</label>
            <input
              type="text"
              value={inputNotes}
              onChange={(e) => setInputNotes(e.target.value)}
              placeholder="Extra details..."
              className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
            />
          </div>

          <div className="col-span-4 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 mb-0.5">Qty</label>
            <input
              type="number"
              step="any"
              value={inputQty}
              onChange={(e) => setInputQty(e.target.value)}
              className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
            />
          </div>

          <div className="col-span-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-0.5">Unit</label>
            <input
              type="text"
              value={inputUnit}
              onChange={(e) => setInputUnit(e.target.value)}
              placeholder="Nos/Mtr/Kg"
              className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
            />
          </div>

          <div className="col-span-4 sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-0.5">Rate</label>
            <input
              type="number"
              step="any"
              value={inputRate}
              onChange={(e) => setInputRate(e.target.value)}
              className="w-full text-sm p-1.5 border rounded focus:outline-blue-500"
            />
          </div>

          <div className="col-span-12 sm:col-span-1 flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm font-semibold"
            >
              ➕ Add
            </button>
          </div>
        </div>
      </form>

      {/* Row Manipulation Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          onClick={handleDeleteLine}
          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 px-2.5 py-1.5 rounded"
        >
          🗑 Delete Line
        </button>
        <button
          type="button"
          onClick={handleInsertManualRow}
          className="text-xs bg-gray-100 hover:bg-gray-200 border px-2.5 py-1.5 rounded"
        >
          ➕ Insert Manual Row
        </button>
        <button
          type="button"
          onClick={() => handleMoveRow(-1)}
          className="text-xs bg-gray-100 hover:bg-gray-200 border px-2.5 py-1.5 rounded"
        >
          ⬆ Move Up
        </button>
        <button
          type="button"
          onClick={() => handleMoveRow(1)}
          className="text-xs bg-gray-100 hover:bg-gray-200 border px-2.5 py-1.5 rounded"
        >
          ⬇ Move Down
        </button>
        <label className="text-xs flex items-center gap-1.5 ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={countSr}
            onChange={(e) => setCountSr(e.target.checked)}
          />
          Count Serial No.
        </label>
      </div>

      {/* Data Table with Inline Editing */}
      <div className="border rounded overflow-x-auto mb-4">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b text-xs text-gray-700 uppercase">
              <th className="p-2.5 w-12 text-center border-r">SR</th>
              <th className="p-2.5 border-r">Particular</th>
              <th className="p-2.5 w-24 text-right border-r">Qty</th>
              <th className="p-2.5 w-24 border-r">Unit</th>
              <th className="p-2.5 w-28 text-right border-r">Rate</th>
              <th className="p-2.5 w-32 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400 italic">
                  No items added yet. Enter items above or insert a manual note row.
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedRowIndex(idx)}
                  className={`border-b cursor-pointer transition-colors ${
                    selectedRowIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="p-2 text-center border-r">{row.sr}</td>
                  <td className="p-1 border-r">
                    <input
                      type="text"
                      value={row.particular}
                      onChange={(e) => handleCellChange(idx, 'particular', e.target.value)}
                      className="w-full p-1 bg-transparent focus:bg-white border-transparent focus:border-blue-400 rounded border"
                    />
                  </td>
                  <td className="p-1 border-r text-right">
                    <input
                      type="number"
                      value={row.qty}
                      onChange={(e) => handleCellChange(idx, 'qty', e.target.value)}
                      className="w-full p-1 bg-transparent focus:bg-white border-transparent focus:border-blue-400 rounded border text-right"
                    />
                  </td>
                  <td className="p-1 border-r">
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => handleCellChange(idx, 'unit', e.target.value)}
                      className="w-full p-1 bg-transparent focus:bg-white border-transparent focus:border-blue-400 rounded border"
                    />
                  </td>
                  <td className="p-1 border-r text-right">
                    <input
                      type="number"
                      value={row.rate}
                      onChange={(e) => handleCellChange(idx, 'rate', e.target.value)}
                      className="w-full p-1 bg-transparent focus:bg-white border-transparent focus:border-blue-400 rounded border text-right"
                    />
                  </td>
                  <td className="p-2 text-right font-medium">₹ {row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals & Tax Overview */}
      <div className="p-4 bg-gray-50 rounded border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-500 uppercase font-semibold">Amount in Words:</div>
          <div className="text-sm font-medium italic text-gray-800">{amountInWords}</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-sm">
            <span className="text-gray-600 mr-2 font-medium">SUB TOTAL:</span>
            <span className="font-semibold">₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {isGst && (
            <>
              <div className="text-sm">
                <span className="text-gray-600 mr-2">SGST ({sgstPercent}%):</span>
                <span>₹ {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 mr-2">CGST ({cgstPercent}%):</span>
                <span>₹ {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          <div className="text-lg font-bold text-emerald-700 pt-1 border-t mt-1">
            <span className="mr-2">GRAND TOTAL:</span>
            <span>₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            type="button"
            onClick={() => setRoundTotal(!roundTotal)}
            className="text-xs mt-1 text-blue-600 hover:underline"
          >
            🔄 {roundTotal ? 'Use Exact Total' : 'Use Rounded Total'}
          </button>
        </div>
      </div>

      {/* Bottom Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex gap-2">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(getPayload())}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded font-medium"
            >
              👁 Preview Bill
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(getPayload())}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-medium"
            >
              💾 Save Invoice
            </button>
          )}
          {onSelectBank && (
            <button
              type="button"
              onClick={onSelectBank}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded font-medium"
            >
              🏦 Select Bank
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAll}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded font-medium"
          >
            🆕 Clear All
          </button>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded font-medium"
          >
            ⬅️ Back
          </button>
        )}
      </div>
    </div>
  );
}