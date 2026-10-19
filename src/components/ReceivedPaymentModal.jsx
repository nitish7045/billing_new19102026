export default function ReceivedPaymentModal({
  open,
  editingPaymentId,
  paymentForm,
  setPaymentForm,
  suggestions,
  cycles = [],
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div
      className="report-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="payment-modal"
        onSubmit={onSubmit}
      >
        <div className="modal-head">
          <h2>
            {editingPaymentId
              ? "Update Received Payment"
              : "Received Payment"}
          </h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label>
          Company / Received From

          <input
            list="received-payment-company-suggestions"
            value={paymentForm.companyName}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                companyName: event.target.value,
              }))
            }
            placeholder="e.g. AK ENTERPRISES, BOB, HDFC, Cash"
            autoComplete="off"
          />

          <datalist id="received-payment-company-suggestions">
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <small className="payment-field-help">
            Select a saved company or type any manual name such as BOB.
          </small>
        </label>

        <label>
          Client / Hisab Cycle
          <select
            value={paymentForm.cycleId || ""}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                cycleId: event.target.value,
              }))
            }
            required={!editingPaymentId}
            disabled={Boolean(editingPaymentId)}
          >
            <option value="">Select client and active cycle</option>
            {cycles
              .filter((cycle) => cycle.status === "open")
              .map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {(cycle.client_name || "General")} — Cycle {cycle.cycle_number}
                </option>
              ))}
          </select>
          <small className="payment-field-help">
            {editingPaymentId ? "Editing payment details does not change its existing Hisab assignment." : "Each payment is assigned to exactly one client and one active cycle."}
          </small>
        </label>

        <label>
          Payment Date

          <input
            type="date"
            value={paymentForm.paymentDate}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                paymentDate: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Received Amount

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={paymentForm.amount}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                amount: event.target.value,
              }))
            }
            placeholder="Enter amount"
          />
        </label>

        <label>
          Notes

          <input
            value={paymentForm.notes}
            onChange={(event) =>
              setPaymentForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
            placeholder="Optional reference / note"
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="report-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            disabled={saving}
            className="report-btn report-btn-primary"
            type="submit"
          >
            {saving
              ? editingPaymentId
                ? "Updating..."
                : "Saving..."
              : editingPaymentId
                ? "Update Payment"
                : "Save Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
