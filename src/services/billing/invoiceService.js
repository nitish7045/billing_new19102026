import { supabase } from "../../lib/supabase";
import {
  deleteDraft,
  getDraft,
} from "./draftService";
function cleanCustomerText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}
function normalizeCustomerText(value) {
  return cleanCustomerText(value).toLowerCase();
}
export async function getNextBillNumber({
  userId,
  companyId,
  billType,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }
  if (!companyId) {
    throw new Error("Company ID is required.");
  }
  if (!billType) {
    throw new Error("Bill type is required.");
  }
  const { data, error } = await supabase
    .from("invoices")
    .select("bill_number")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("bill_type", billType);
  if (error) {
    console.error(
      "Error fetching bill numbers:",
      error
    );
    throw error;
  }
  let highestNumber = 0;
  for (const invoice of data || []) {
    const raw = String(
      invoice?.bill_number || ""
    ).trim();
    if (!/^\d+$/.test(raw)) {
      continue;
    }
    const number = parseInt(raw, 10);
    if (
      Number.isFinite(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }
  return String(
    highestNumber + 1
  ).padStart(2, "0");
}
async function resolveCustomer({
  profile,
  customer = null,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is missing."
    );
  }
  const toAddress = cleanCustomerText(
    customer?.to_address ??
      customer?.toAddress ??
      customer?.customer_to ??
      customer?.customerTo ??
      ""
  );
  const site = cleanCustomerText(
    customer?.site ??
      customer?.customer_site ??
      customer?.customerSite ??
      ""
  );
  if (!toAddress && !site) {
    return {
      customerId: null,
      customerTo: "",
      customerSite: "",
      customerRecord: null,
    };
  }
  const normalizedTo =
    normalizeCustomerText(toAddress);
  const normalizedSite =
    normalizeCustomerText(site);
  const {
    data: existingCustomers,
    error: customerFetchError,
  } = await supabase
    .from("customers")
    .select(
      "id, user_id, to_address, site"
    )
    .eq(
      "user_id",
      profile.id
    );
  if (customerFetchError) {
    console.error(
      "Error loading customers:",
      customerFetchError
    );
    throw customerFetchError;
  }
  const existingCustomer =
    (existingCustomers || []).find(
      (item) => {
        const existingTo =
          normalizeCustomerText(
            item.to_address
          );
        const existingSite =
          normalizeCustomerText(
            item.site
          );
        return (
          existingTo === normalizedTo &&
          existingSite === normalizedSite
        );
      }
    );
  if (existingCustomer) {
    return {
      customerId:
        existingCustomer.id,
      customerTo:
        cleanCustomerText(
          existingCustomer.to_address
        ),
      customerSite:
        cleanCustomerText(
          existingCustomer.site
        ),
      customerRecord:
        existingCustomer,
    };
  }
  const {
    data: newCustomer,
    error: customerInsertError,
  } = await supabase
    .from("customers")
    .insert({
      user_id:
        profile.id,
      to_address:
        toAddress || null,
      site:
        site || null,
    })
    .select()
    .single();
  if (!customerInsertError) {
    return {
      customerId:
        newCustomer.id,
      customerTo:
        cleanCustomerText(
          newCustomer.to_address
        ),
      customerSite:
        cleanCustomerText(
          newCustomer.site
        ),
      customerRecord:
        newCustomer,
    };
  }
  console.warn(
    "Customer insert failed. Checking for existing customer...",
    customerInsertError
  );
  const {
    data: retryCustomers,
    error: retryError,
  } = await supabase
    .from("customers")
    .select(
      "id, user_id, to_address, site"
    )
    .eq(
      "user_id",
      profile.id
    );
  if (!retryError) {
    const retryCustomer =
      (retryCustomers || []).find(
        (item) =>
          normalizeCustomerText(
            item.to_address
          ) === normalizedTo &&
          normalizeCustomerText(
            item.site
          ) === normalizedSite
      );
    if (retryCustomer) {
      return {
        customerId:
          retryCustomer.id,
        customerTo:
          cleanCustomerText(
            retryCustomer.to_address
          ),
        customerSite:
          cleanCustomerText(
            retryCustomer.site
          ),
        customerRecord:
          retryCustomer,
      };
    }
  }
  throw customerInsertError;
}
function buildInvoiceData({
  profile,
  company,
  bank,
  customerId,
  customerTo,
  customerSite,
  signaturePath,
  billType,
  billNumber,
  billDate,
  subtotal,
  sgstRate,
  sgstAmount,
  cgstRate,
  cgstAmount,
  grandTotal,
  isRounded,
  roundOff,
  amountInWords,
  notes,
  isdelete = 0,
  status = "saved",
}) {
  const companyName =
    company?.company_name || "";
  const companyGstNo =
    company?.gst_no || "";
  const bankName =
    bank?.bank_name ||
    company?.bank_name ||
    "";
  const bankAccountNumber =
    bank?.account_number ||
    company?.account_no ||
    "";
  const bankIfscCode =
    bank?.ifsc_code ||
    company?.ifsc_code ||
    "";
  const bankBranch =
    bank?.branch || "";
  return {
    user_id:
      profile.id,
    company_id:
      company.id,
    bank_id:
      bank?.id || null,
    bill_type:
      billType,
    bill_number:
      billNumber,
    bill_date:
      billDate,
    customer_id:
      customerId || null,
    customer_to:
      customerTo || "",
    customer_site:
      customerSite || "",
    company_name:
      companyName,
    company_gst_no:
      companyGstNo,
    bank_name:
      bankName,
    bank_account_number:
      bankAccountNumber,
    bank_ifsc_code:
      bankIfscCode,
    bank_branch:
      bankBranch,
    signature_path:
      signaturePath || null,
    subtotal:
      Number(subtotal) || 0,
    sgst_rate:
      Number(sgstRate) || 0,
    sgst_amount:
      Number(sgstAmount) || 0,
    cgst_rate:
      Number(cgstRate) || 0,
    cgst_amount:
      Number(cgstAmount) || 0,
    grand_total:
      Number(grandTotal) || 0,
    is_rounded:
      Boolean(isRounded),
    round_off:
      Number(roundOff) || 0,
    amount_in_words:
      amountInWords || "",
    notes:
      notes || "",
    status:
      status || "saved",
    isdelete:
      Number(isdelete) === 1
        ? 1
        : 0,
  };
}
function buildInvoiceItems({
  invoiceId,
  items = [],
}) {
  return items.map(
    (item, index) => {
      const isManual =
        item.type === "manual" ||
        item.is_manual === true;
      const particular =
        String(
          item.particular || ""
        );
      const isBlankRow =
        isManual &&
        particular.trim() === "";
      const quantity =
        isManual
          ? null
          : Number(item.qty) || 0;
      const rate =
        isManual
          ? null
          : Number(item.rate) || 0;
      const calculatedAmount =
        quantity * rate;
      const amount =
        isManual
          ? 0
          : Number.isFinite(
              Number(item.amount)
            )
            ? Number(item.amount)
            : calculatedAmount;
      let showSrNo;
      if (!isManual) {
        showSrNo = true;
      } else if (isBlankRow) {
        showSrNo = false;
      } else {
        showSrNo = Boolean(
          item.showSrNo ??
          item.show_sr_no ??
          false
        );
      }
      return {
        invoice_id:
          invoiceId,
        product_id:
          isManual
            ? null
            : item.productId ||
              item.product_id ||
              null,
        particular,
        notes:
          item.notes || "",
        qty:
          quantity,
        unit:
          item.unit || "",
        rate,
        amount,
        sort_order:
          index,
        is_manual:
          isManual,
        show_sr_no:
          showSrNo,
        bold:
          Boolean(item.bold),
        center:
          Boolean(item.center),
      };
    }
  );
}
export async function saveInvoice({
  profile,
  company,
  bank = null,
  customer = null,
  signaturePath = null,
  draftId = null,
  billType,
  billNumber = null,
  billDate,
  items = [],
  subtotal = 0,
  sgstRate = 0,
  sgstAmount = 0,
  cgstRate = 0,
  cgstAmount = 0,
  grandTotal = 0,
  isRounded = false,
  roundOff = 0,
  amountInWords = "",
  notes = "",
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is missing."
    );
  }
  if (!company?.id) {
    throw new Error(
      "Company is required."
    );
  }
  if (!billType) {
    throw new Error(
      "Bill type is required."
    );
  }
  if (!billDate) {
    throw new Error(
      "Bill date is required."
    );
  }
  const resolvedCustomer =
    await resolveCustomer({
      profile,
      customer,
    });
  const formattedBillNumber =
    await getNextBillNumber({
      userId:
        profile.id,
      companyId:
        company.id,
      billType,
    });
  void billNumber;
  const invoiceData =
    buildInvoiceData({
      profile,
      company,
      bank,
      customerId:
        resolvedCustomer.customerId,
      customerTo:
        resolvedCustomer.customerTo,
      customerSite:
        resolvedCustomer.customerSite,
      signaturePath,
      billType,
      billNumber:
        formattedBillNumber,
      billDate,
      subtotal,
      sgstRate,
      sgstAmount,
      cgstRate,
      cgstAmount,
      grandTotal,
      isRounded,
      roundOff,
      amountInWords,
      notes,
      isdelete: 0,
      status:
        "saved",
    });
  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .insert(invoiceData)
    .select()
    .single();
  if (invoiceError) {
    console.error(
      "Error saving invoice:",
      invoiceError
    );
    if (
      invoiceError.code ===
      "23505"
    ) {
      throw new Error(
        `Bill number ${formattedBillNumber} already exists for this company and bill type. Please save again to get the next available number.`
      );
    }
    throw invoiceError;
  }
  if (items.length > 0) {
    const invoiceItems =
      buildInvoiceItems({
        invoiceId:
          invoice.id,
        items,
      });
    const {
      error: itemsError,
    } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);
    if (itemsError) {
      console.error(
        "Error saving invoice items:",
        itemsError
      );
      const {
        error: rollbackError,
      } = await supabase
        .from("invoices")
        .delete()
        .eq(
          "id",
          invoice.id
        )
        .eq(
          "user_id",
          profile.id
        );
      if (rollbackError) {
        console.error(
          "Invoice rollback failed:",
          rollbackError
        );
      }
      throw itemsError;
    }
  }
  if (draftId) {
    try {
      const existingDraft =
        await getDraft(draftId);
      if (existingDraft) {
        await deleteDraft(draftId);
        console.log(
          "Completed draft deleted successfully:",
          draftId
        );
      }
    } catch (draftDeleteError) {
      console.error(
        "Invoice saved successfully, but completed draft could not be deleted:",
        draftDeleteError
      );
    }
  }
  return {
    ...invoice,
    billNumber:
      invoice.bill_number,
    bill_number:
      invoice.bill_number,
  };
}
export async function updateInvoice({
  profile,
  invoiceId,
  company,
  bank = null,
  customer = null,
  signaturePath = null,
  billType,
  billNumber,
  billDate,
  items = [],
  subtotal = 0,
  sgstRate = 0,
  sgstAmount = 0,
  cgstRate = 0,
  cgstAmount = 0,
  grandTotal = 0,
  isRounded = false,
  roundOff = 0,
  amountInWords = "",
  notes = "",
  status = "saved",
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is missing."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required for update."
    );
  }
  if (!company?.id) {
    throw new Error(
      "Company is required."
    );
  }
  if (!billType) {
    throw new Error(
      "Bill type is required."
    );
  }
  if (!billNumber) {
    throw new Error(
      "Bill number is required when updating an invoice."
    );
  }
  if (!billDate) {
    throw new Error(
      "Bill date is required."
    );
  }
  const resolvedCustomer =
    await resolveCustomer({
      profile,
      customer,
    });
  const invoiceData =
    buildInvoiceData({
      profile,
      company,
      bank,
      customerId:
        resolvedCustomer.customerId,
      customerTo:
        resolvedCustomer.customerTo,
      customerSite:
        resolvedCustomer.customerSite,
      signaturePath,
      billType,
      billNumber,
      billDate,
      subtotal,
      sgstRate,
      sgstAmount,
      cgstRate,
      cgstAmount,
      grandTotal,
      isRounded,
      roundOff,
      amountInWords,
      notes,
      isdelete: 0,
      status,
    });
  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .update(invoiceData)
    .eq(
      "id",
      invoiceId
    )
    .eq(
      "user_id",
      profile.id
    )
    .eq(
      "isdelete",
      0
    )
    .select()
    .single();
  if (invoiceError) {
    console.error(
      "Error updating invoice:",
      invoiceError
    );
    if (
      invoiceError.code ===
      "23505"
    ) {
      throw new Error(
        `Bill number ${billNumber} already exists for this company and bill type.`
      );
    }
    throw invoiceError;
  }
  if (!invoice) {
    throw new Error(
      "Invoice was not found or has been deleted."
    );
  }
  const {
    error: deleteItemsError,
  } = await supabase
    .from("invoice_items")
    .delete()
    .eq(
      "invoice_id",
      invoiceId
    );
  if (deleteItemsError) {
    console.error(
      "Error removing old invoice items:",
      deleteItemsError
    );
    throw deleteItemsError;
  }
  if (items.length > 0) {
    const invoiceItems =
      buildInvoiceItems({
        invoiceId,
        items,
      });
    const {
      error: insertItemsError,
    } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);
    if (insertItemsError) {
      console.error(
        "Error saving updated invoice items:",
        insertItemsError
      );
      throw insertItemsError;
    }
  }
  return {
    ...invoice,
    billNumber:
      invoice.bill_number,
    bill_number:
      invoice.bill_number,
  };
}
export async function softDeleteInvoice({
  profile,
  invoiceId,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is required."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }
  const {
    data,
    error,
  } = await supabase
    .from("invoices")
    .update({
      isdelete: 1,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      invoiceId
    )
    .eq(
      "user_id",
      profile.id
    )
    .eq(
      "isdelete",
      0
    )
    .select()
    .single();
  if (error) {
    console.error(
      "Error soft deleting invoice:",
      error
    );
    throw error;
  }
  if (!data) {
    throw new Error(
      "Invoice was not found or has already been deleted."
    );
  }
  return data;
}
export async function deleteInvoice({
  profile,
  invoiceId,
}) {
  return softDeleteInvoice({
    profile,
    invoiceId,
  });
}
export async function restoreInvoice({
  profile,
  invoiceId,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is required."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }
  const {
    data,
    error,
  } = await supabase
    .from("invoices")
    .update({
      isdelete: 0,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      invoiceId
    )
    .eq(
      "user_id",
      profile.id
    )
    .eq(
      "isdelete",
      1
    )
    .select()
    .single();
  if (error) {
    console.error(
      "Error restoring invoice:",
      error
    );
    throw error;
  }
  if (!data) {
    throw new Error(
      "Invoice was not found in deleted bills."
    );
  }
  return data;
}
export async function permanentlyDeleteInvoice({
  profile,
  invoiceId,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is missing."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }
  const {
    data: invoice,
    error: invoiceFetchError,
  } = await supabase
    .from("invoices")
    .select(`
      id,
      user_id,
      bill_number,
      isdelete
    `)
    .eq("id", invoiceId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (invoiceFetchError) {
    console.error(
      "Error checking deleted invoice:",
      invoiceFetchError
    );
    throw invoiceFetchError;
  }
  if (!invoice) {
    throw new Error(
      "Invoice not found."
    );
  }
  if (Number(invoice.isdelete) !== 1) {
    throw new Error(
      "Only deleted invoices can be permanently deleted."
    );
  }
  const {
    error: deleteItemsError,
  } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (deleteItemsError) {
    console.error(
      "Error permanently deleting invoice items:",
      deleteItemsError
    );
    throw deleteItemsError;
  }
  const {
    error: deleteInvoiceError,
  } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", profile.id)
    .eq("isdelete", 1);
  if (deleteInvoiceError) {
    console.error(
      "Error permanently deleting invoice:",
      deleteInvoiceError
    );
    throw deleteInvoiceError;
  }
  return {
    success: true,
    invoiceId,
    billNumber: invoice.bill_number,
  };
}
export async function getInvoice({
  profile,
  invoiceId,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is missing."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }
  const {
    data,
    error,
  } = await supabase
    .from("invoices")
    .select(`
      id,
      user_id,
      company_id,
      bank_id,
      bill_type,
      bill_number,
      bill_date,
      customer_id,
      customer_to,
      customer_site,
      company_name,
      company_gst_no,
      bank_name,
      bank_account_number,
      bank_ifsc_code,
      bank_branch,
      subtotal,
      sgst_rate,
      sgst_amount,
      cgst_rate,
      cgst_amount,
      grand_total,
      is_rounded,
      round_off,
      amount_in_words,
      notes,
      status,
      signature_path,
      payment_status,
      is_important,
      payment_updated_at,
      isdelete,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      invoiceId
    )
    .eq(
      "user_id",
      profile.id
    )
    .eq(
      "isdelete",
      0
    )
    .maybeSingle();
  if (error) {
    console.error(
      "Error loading invoice:",
      error
    );
    throw error;
  }
  if (!data) {
    throw new Error(
      "Invoice not found or has been deleted."
    );
  }
  return data;
}
export async function getInvoiceItems({
  profile,
  invoiceId,
}) {
  if (!profile?.id) {
    throw new Error(
      "User profile is required."
    );
  }
  if (!invoiceId) {
    throw new Error(
      "Invoice ID is required."
    );
  }
  const invoice =
    await getInvoice({
      profile,
      invoiceId,
    });
  if (!invoice) {
    throw new Error(
      "Invoice not found."
    );
  }
  const {
    data,
    error,
  } = await supabase
    .from("invoice_items")
    .select(`
      id,
      invoice_id,
      product_id,
      particular,
      notes,
      qty,
      unit,
      rate,
      amount,
      sort_order,
      is_manual,
      show_sr_no,
      bold,
      center,
      created_at
    `)
    .eq(
      "invoice_id",
      invoiceId
    )
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );
  if (error) {
    console.error(
      "Error loading invoice items:",
      error
    );
    throw error;
  }
  const items =
    (data || []).map(
      (item) => {
        const isManual =
          Boolean(
            item.is_manual
          );
        const particular =
          String(
            item.particular || ""
          );
        const isBlankRow =
          isManual &&
          particular.trim() === "";
        let showSrNo;
        if (!isManual) {
          showSrNo = true;
        } else if (isBlankRow) {
          showSrNo = false;
        } else {
          showSrNo =
            Boolean(
              item.show_sr_no
            );
        }
        return {
          ...item,
          showSrNo,
          show_sr_no:
            showSrNo,
          type:
            isManual
              ? "manual"
              : "product",
          productId:
            item.product_id ||
            null,
          qty:
            item.qty == null
              ? ""
              : Number(
                  item.qty
                ),
          rate:
            item.rate == null
              ? ""
              : Number(
                  item.rate
                ),
          amount:
            Number(
              item.amount
            ) || 0,
          bold:
            Boolean(
              item.bold
            ),
          center:
            Boolean(
              item.center
            ),
        };
      }
    );
  return {
    invoice,
    items,
  };
}
