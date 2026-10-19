import {

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { supabase } from "../lib/supabase";

function Customers() {

  const [customers, setCustomers] =

    useState([]);

  const [search, setSearch] =

    useState("");

  const [toAddress, setToAddress] =

    useState("");

  const [site, setSite] =

    useState("");

  const [selectedCustomer, setSelectedCustomer] =

    useState(null);

  const [loading, setLoading] =

    useState(true);

  const [saving, setSaving] =

    useState(false);

  const [importing, setImporting] =

    useState(false);

  const [csvImporting, setCsvImporting] =

    useState(false);

  const [message, setMessage] =

    useState("");

  const csvInputRef = useRef(null);

  // =====================================

  // GET CURRENT USER

  // =====================================

  async function getCurrentUser() {

    const {

      data: { user },

      error,

    } = await supabase.auth.getUser();

    if (error) {

      throw error;

    }

    if (!user) {

      throw new Error(

        "User not logged in."

      );

    }

    return user;

  }

  // =====================================

  // NORMALIZE TEXT

  // =====================================

  function normalizeText(value) {

    return (value || "")

      .trim()

      .replace(/\s+/g, " ")

      .toLowerCase();

  }

  // =====================================

  // CLEAN TEXT

  // =====================================

  function cleanText(value) {
    // Preserve intentional line breaks while trimming accidental spaces.
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim().replace(/[ \t]+/g, " "))
      .join("\n")
      .trim();
  }

  // =====================================

  // LOAD CUSTOMERS

  // =====================================

  async function loadCustomers() {

    try {

      setLoading(true);

      setMessage("");

      const user =

        await getCurrentUser();

      const { data, error } =

        await supabase

          .from("customers")

          .select("*")

          .eq(

            "user_id",

            user.id

          )

          .order(

            "created_at",

            {

              ascending: false,

            }

          );

      if (error) {

        throw error;

      }

      setCustomers(data || []);

    } catch (error) {

      console.error(

        "Load customers error:",

        error

      );

      setMessage(

        `❌ Failed to load customers: ${error.message}`

      );

    } finally {

      setLoading(false);

    }

  }

  // =====================================

  // INITIAL LOAD

  // =====================================

  useEffect(() => {

    loadCustomers();

  }, []);

  // =====================================

  // RESET FORM

  // =====================================

  function resetForm() {

    setToAddress("");

    setSite("");

    setSelectedCustomer(null);

    setMessage("");

  }

  // =====================================

  // CHECK DUPLICATE

  // =====================================

  function isDuplicateCustomer(

    newToAddress,

    newSite,

    excludeId = null

  ) {

    const normalizedTo =

      normalizeText(

        newToAddress

      );

    const normalizedSite =

      normalizeText(

        newSite

      );

    return customers.some(

      (customer) => {

        if (

          excludeId &&

          customer.id === excludeId

        ) {

          return false;

        }

        const existingTo =

          normalizeText(

            customer.to_address

          );

        const existingSite =

          normalizeText(

            customer.site

          );

        return (

          existingTo === normalizedTo &&

          existingSite === normalizedSite

        );

      }

    );

  }

  // =====================================

  // ADD CUSTOMER

  // =====================================

  async function handleAddCustomer() {

    const cleanTo =

      cleanText(

        toAddress

      );

    const cleanSite =

      cleanText(

        site

      );

    setMessage("");

    if (

      !cleanTo &&

      !cleanSite

    ) {

      setMessage(

        "❌ Enter at least To Address or Site."

      );

      return;

    }

    if (

      isDuplicateCustomer(

        cleanTo,

        cleanSite

      )

    ) {

      setMessage(

        "❌ This exact customer combination already exists."

      );

      return;

    }

    try {

      setSaving(true);

      const user =

        await getCurrentUser();

      const {

        data,

        error,

      } =

        await supabase

          .from("customers")

          .insert({

            user_id:

              user.id,

            to_address:

              cleanTo || null,

            site:

              cleanSite || null,

          })

          .select()

          .single();

      if (error) {

        throw error;

      }

      setCustomers(

        (previous) => [

          data,

          ...previous,

        ]

      );

      setToAddress("");

      setSite("");

      setMessage(

        "✅ Customer added successfully."

      );

    } catch (error) {

      console.error(

        "Add customer error:",

        error

      );

      setMessage(

        `❌ Failed to add customer: ${error.message}`

      );

    } finally {

      setSaving(false);

    }

  }

  // =====================================

  // EDIT

  // =====================================

  function handleEdit(customer) {

    setSelectedCustomer(

      customer

    );

    setToAddress(

      customer.to_address || ""

    );

    setSite(

      customer.site || ""

    );

    setMessage("");

    window.scrollTo({

      top: 0,

      behavior: "smooth",

    });

  }

  // =====================================

  // UPDATE CUSTOMER

  // =====================================

  async function handleUpdateCustomer() {

    if (!selectedCustomer) {

      return;

    }

    const cleanTo =

      cleanText(

        toAddress

      );

    const cleanSite =

      cleanText(

        site

      );

    setMessage("");

    if (

      !cleanTo &&

      !cleanSite

    ) {

      setMessage(

        "❌ Enter at least To Address or Site."

      );

      return;

    }

    if (

      isDuplicateCustomer(

        cleanTo,

        cleanSite,

        selectedCustomer.id

      )

    ) {

      setMessage(

        "❌ Another customer with this exact To + Site combination already exists."

      );

      return;

    }

    try {

      setSaving(true);

      const user =

        await getCurrentUser();

      const {

        data,

        error,

      } =

        await supabase

          .from("customers")

          .update({

            to_address:

              cleanTo || null,

            site:

              cleanSite || null,

            updated_at:

              new Date().toISOString(),

          })

          .eq(

            "id",

            selectedCustomer.id

          )

          .eq(

            "user_id",

            user.id

          )

          .select()

          .single();

      if (error) {

        throw error;

      }

      setCustomers(

        (previous) =>

          previous.map(

            (customer) =>

              customer.id === data.id

                ? data

                : customer

          )

      );

      resetForm();

      setMessage(

        "✅ Customer updated successfully."

      );

    } catch (error) {

      console.error(

        "Update customer error:",

        error

      );

      setMessage(

        `❌ Failed to update customer: ${error.message}`

      );

    } finally {

      setSaving(false);

    }

  }

  // =====================================

  // DELETE CUSTOMER

  // =====================================

  async function handleDelete(customer) {

    const displayName =

      customer.to_address ||

      customer.site ||

      "this customer";

    const confirmed =

      window.confirm(

        `Delete "${displayName}"?`

      );

    if (!confirmed) {

      return;

    }

    try {

      setSaving(true);

      const user =

        await getCurrentUser();

      const { error } =

        await supabase

          .from("customers")

          .delete()

          .eq(

            "id",

            customer.id

          )

          .eq(

            "user_id",

            user.id

          );

      if (error) {

        throw error;

      }

      setCustomers(

        (previous) =>

          previous.filter(

            (item) =>

              item.id !== customer.id

          )

      );

      if (

        selectedCustomer?.id ===

        customer.id

      ) {

        resetForm();

      }

      setMessage(

        "✅ Customer deleted successfully."

      );

    } catch (error) {

      console.error(

        "Delete customer error:",

        error

      );

      setMessage(

        `❌ Failed to delete customer: ${error.message}`

      );

    } finally {

      setSaving(false);

    }

  }

  // =====================================

  // IMPORT CUSTOMERS FROM INVOICES

  // =====================================

  async function handleImportCustomers() {

    const confirmed =

      window.confirm(

        "Import customers from existing invoices?"

      );

    if (!confirmed) {

      return;

    }

    try {

      setImporting(true);

      setMessage("");

      const user =

        await getCurrentUser();

      const {

        data: invoices,

        error: invoiceError,

      } =

        await supabase

          .from("invoices")

          .select(

            "customer_to, customer_site"

          )

          .eq(

            "user_id",

            user.id

          );

      if (invoiceError) {

        throw invoiceError;

      }

      const existingKeys =

        new Set();

      customers.forEach(

        (customer) => {

          const to =

            normalizeText(

              customer.to_address

            );

          const customerSite =

            normalizeText(

              customer.site

            );

          existingKeys.add(

            `${to}|||${customerSite}`

          );

        }

      );

      const newCustomers = [];

      for (

        const invoice of invoices || []

      ) {

        const cleanTo =

          cleanText(

            invoice.customer_to

          );

        const cleanSite =

          cleanText(

            invoice.customer_site

          );

        if (

          !cleanTo &&

          !cleanSite

        ) {

          continue;

        }

        const key =

          `${normalizeText(cleanTo)}|||${normalizeText(cleanSite)}`;

        if (

          existingKeys.has(key)

        ) {

          continue;

        }

        newCustomers.push({

          user_id:

            user.id,

          to_address:

            cleanTo || null,

          site:

            cleanSite || null,

        });

        existingKeys.add(key);

      }

      if (

        newCustomers.length === 0

      ) {

        setMessage(

          "ℹ️ No new customers found."

        );

        return;

      }

      const {

        error: insertError,

      } =

        await supabase

          .from("customers")

          .insert(

            newCustomers

          );

      if (insertError) {

        throw insertError;

      }

      await loadCustomers();

      setMessage(

        `✅ ${newCustomers.length} customer(s) imported successfully from invoices.`

      );

    } catch (error) {

      console.error(

        "Import customers error:",

        error

      );

      setMessage(

        `❌ Failed to import customers: ${error.message}`

      );

    } finally {

      setImporting(false);

    }

  }

  // =====================================

  // PARSE CSV LINE

  // Supports commas inside quotes

  // =====================================

  function parseCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;

    for (

      let i = 0;

      i < line.length;

      i++

    ) {

      const char =

        line[i];

      const nextChar =

        line[i + 1];

      if (

        char === '"' &&

        insideQuotes &&

        nextChar === '"'

      ) {

        current += '"';

        i++;

      } else if (

        char === '"'

      ) {

        insideQuotes =

          !insideQuotes;

      } else if (

        char === "," &&

        !insideQuotes

      ) {

        result.push(

          current.trim()

        );

        current = "";

      } else {

        current += char;

      }

    }

    result.push(

      current.trim()

    );

    return result;

  }

  // =====================================

  // PARSE CSV TEXT

  // =====================================

  function parseCSV(text) {

    const lines =

      text

        .replace(

          /^\uFEFF/,

          ""

        )

        .split(

          /\r?\n/

        )

        .filter(

          (line) =>

            line.trim() !== ""

        );

    if (

      lines.length < 2

    ) {

      throw new Error(

        "CSV must contain a header row and at least one customer."

      );

    }

    const headers =

      parseCSVLine(

        lines[0]

      ).map(

        (header) =>

          normalizeText(

            header

          )

      );

    const toAddressIndex =

      headers.findIndex(

        (header) =>

          [

            "to address",

            "to_address",

            "address",

            "customer address",

            "customer",

            "to",

          ].includes(

            header

          )

      );

    const siteIndex =

      headers.findIndex(

        (header) =>

          [

            "site",

            "site name",

            "site_name",

          ].includes(

            header

          )

      );

    if (

      toAddressIndex === -1 &&

      siteIndex === -1

    ) {

      throw new Error(

        'CSV must contain at least a "To Address" or "Site" column.'

      );

    }

    const rows = [];

    for (

      let i = 1;

      i < lines.length;

      i++

    ) {

      const columns =

        parseCSVLine(

          lines[i]

        );

      const toAddress =

        toAddressIndex >= 0

          ? cleanText(

              columns[

                toAddressIndex

              ]

            )

          : "";

      const customerSite =

        siteIndex >= 0

          ? cleanText(

              columns[

                siteIndex

              ]

            )

          : "";

      if (

        !toAddress &&

        !customerSite

      ) {

        continue;

      }

      rows.push({

        to_address:

          toAddress || null,

        site:

          customerSite || null,

      });

    }

    return rows;

  }

  // =====================================

  // HANDLE CSV IMPORT

  // =====================================

  async function handleCSVImport(event) {

    const file =

      event.target.files?.[0];

    if (!file) {

      return;

    }

    if (

      !file.name

        .toLowerCase()

        .endsWith(".csv")

    ) {

      setMessage(

        "❌ Please select a valid CSV file."

      );

      event.target.value = "";

      return;

    }

    try {

      setCsvImporting(true);

      setMessage("");

      const confirmed =

        window.confirm(

          `Import customers from "${file.name}"?`

        );

      if (!confirmed) {

        return;

      }

      const text =

        await file.text();

      const parsedCustomers =

        parseCSV(text);

      if (

        parsedCustomers.length === 0

      ) {

        throw new Error(

          "No valid customers found in the CSV file."

        );

      }

      const user =

        await getCurrentUser();

      // Existing customers

      const existingKeys =

        new Set();

      customers.forEach(

        (customer) => {

          const key =

            `${normalizeText(customer.to_address)}|||${normalizeText(customer.site)}`;

          existingKeys.add(

            key

          );

        }

      );

      const newCustomers = [];

      let duplicateCount = 0;

      // Remove duplicates from CSV

      // and existing customer list

      for (

        const customer of parsedCustomers

      ) {

        const cleanTo =

          cleanText(

            customer.to_address

          );

        const cleanSite =

          cleanText(

            customer.site

          );

        const key =

          `${normalizeText(cleanTo)}|||${normalizeText(cleanSite)}`;

        if (

          existingKeys.has(key)

        ) {

          duplicateCount++;

          continue;

        }

        newCustomers.push({

          user_id:

            user.id,

          to_address:

            cleanTo || null,

          site:

            cleanSite || null,

        });

        existingKeys.add(

          key

        );

      }

      if (

        newCustomers.length === 0

      ) {

        setMessage(

          `ℹ️ No new customers imported. ${duplicateCount} duplicate row(s) were skipped.`

        );

        return;

      }

      const {

        error: insertError,

      } =

        await supabase

          .from("customers")

          .insert(

            newCustomers

          );

      if (insertError) {

        throw insertError;

      }

      await loadCustomers();

      let successMessage =

        `✅ ${newCustomers.length} customer(s) imported successfully from CSV.`;

      if (

        duplicateCount > 0

      ) {

        successMessage +=

          ` ${duplicateCount} duplicate row(s) skipped.`;

      }

      setMessage(

        successMessage

      );

    } catch (error) {

      console.error(

        "CSV import error:",

        error

      );

      setMessage(

        `❌ Failed to import CSV: ${error.message}`

      );

    } finally {

      setCsvImporting(false);

      // Reset file input

      event.target.value = "";

    }

  }

  // =====================================

  // OPEN CSV FILE SELECTOR

  // =====================================

  function openCSVSelector() {

    if (

      csvInputRef.current

    ) {

      csvInputRef.current.click();

    }

  }

  // =====================================

  // DOWNLOAD CSV TEMPLATE

  // =====================================

  function downloadCSVTemplate() {

    const csvContent =

      `To Address,Site

ABC Company,Mumbai

XYZ Traders,Powai

"Sample Customer, Address",Andheri`;

    const blob =

      new Blob(

        [csvContent],

        {

          type:

            "text/csv;charset=utf-8;",

        }

      );

    const url =

      URL.createObjectURL(

        blob

      );

    const link =

      document.createElement(

        "a"

      );

    link.href = url;

    link.setAttribute(

      "download",

      "customers_template.csv"

    );

    document.body.appendChild(

      link

    );

    link.click();

    document.body.removeChild(

      link

    );

    URL.revokeObjectURL(

      url

    );

  }

  // =====================================

  // SEARCH

  // =====================================

  const filteredCustomers =

    useMemo(() => {

      const query =

        normalizeText(

          search

        );

      if (!query) {

        return customers;

      }

      return customers.filter(

        (customer) => {

          const customerTo =

            normalizeText(

              customer.to_address

            );

          const customerSite =

            normalizeText(

              customer.site

            );

          return (

            customerTo.includes(

              query

            ) ||

            customerSite.includes(

              query

            )

          );

        }

      );

    }, [

      customers,

      search,

    ]);

  // =====================================

  // UI

  // =====================================

  return (

    <div

      style={styles.container}

    >

      {/* HEADER */}

      <div

        style={styles.header}

      >

        <div>

          <h1

            style={styles.title}

          >

            Customers

          </h1>

          <p

            style={styles.subtitle}

          >

            Manage customer addresses and sites

          </p>

        </div>

        <div

          style={styles.countBadge}

        >

          {customers.length} Customers

        </div>

      </div>

      {/* FORM CARD */}

      <div

        style={styles.card}

      >

        <div

          style={styles.cardHeader}

        >

          <h2

            style={styles.cardTitle}

          >

            {selectedCustomer

              ? "Edit Customer"

              : "Add Customer"}

          </h2>

          {selectedCustomer && (

            <span

              style={

                styles.editingBadge

              }

            >

              Editing

            </span>

          )}

        </div>

        <div

          style={styles.formRow}

        >

          {/* TO ADDRESS */}

          <div

            style={

              styles.formGroup

            }

          >

            <label

              style={

                styles.label

              }

            >

              To Address

            </label>

            <textarea

              value={toAddress}

              onChange={(event) =>

                setToAddress(

                  event.target.value

                )

              }

              placeholder="Enter customer address"

              rows={3}

              disabled={saving}

              style={

                styles.textarea

              }

            />

          </div>

          {/* SITE */}

          <div

            style={

              styles.formGroup

            }

          >

            <label

              style={

                styles.label

              }

            >

              Site

            </label>

            <textarea
              value={site}
              onChange={(event) => setSite(event.target.value)}
              placeholder="Enter site name (multiple lines supported)"
              rows={3}
              disabled={saving}
              style={styles.textarea}
            />

          </div>

        </div>

        <div

          style={

            styles.formFooter

          }

        >

          <p

            style={

              styles.helpText

            }

          >

            At least one field is required.

            Exact duplicate To + Site combinations

            are not allowed.

          </p>

          <div

            style={

              styles.buttonRow

            }

          >

            {!selectedCustomer ? (

              <button

                type="button"

                onClick={

                  handleAddCustomer

                }

                disabled={saving}

                style={{

                  ...styles.primaryButton,

                  ...(saving

                    ? styles.disabledButton

                    : {}),

                }}

              >

                {saving

                  ? "Saving..."

                  : "➕ Add Customer"}

              </button>

            ) : (

              <>

                <button

                  type="button"

                  onClick={

                    handleUpdateCustomer

                  }

                  disabled={saving}

                  style={{

                    ...styles.primaryButton,

                    ...(saving

                      ? styles.disabledButton

                      : {}),

                  }}

                >

                  {saving

                    ? "Updating..."

                    : "💾 Update Customer"}

                </button>

                <button

                  type="button"

                  onClick={

                    resetForm

                  }

                  disabled={saving}

                  style={

                    styles.secondaryButton

                  }

                >

                  Cancel

                </button>

              </>

            )}

          </div>

        </div>

      </div>

      {/* MESSAGE */}

      {message && (

        <div

          style={{

            ...styles.message,

            ...(message.startsWith(

              "❌"

            )

              ? styles.errorMessage

              : message.startsWith(

                  "ℹ️"

                )

              ? styles.infoMessage

              : styles.successMessage),

          }}

        >

          {message}

        </div>

      )}

      {/* TOOLBAR */}

      <div

        style={styles.toolbar}

      >

        <div

          style={

            styles.searchWrapper

          }

        >

          <input

            type="text"

            value={search}

            onChange={(event) =>

              setSearch(

                event.target.value

              )

            }

            placeholder="🔍 Search customers..."

            style={

              styles.searchInput

            }

          />

        </div>

        <div

          style={

            styles.toolbarButtons

          }

        >

          {/* IMPORT FROM INVOICES */}

          <button

            type="button"

            onClick={

              handleImportCustomers

            }

            disabled={

              importing ||

              saving ||

              csvImporting

            }

            style={{

              ...styles.importButton,

              ...(importing ||

              saving ||

              csvImporting

                ? styles.disabledButton

                : {}),

            }}

          >

            {importing

              ? "Importing..."

              : "📥 Import from Invoices"}

          </button>

          {/* IMPORT CSV */}

          <button

            type="button"

            onClick={

              openCSVSelector

            }

            disabled={

              csvImporting ||

              saving ||

              importing

            }

            style={{

              ...styles.csvImportButton,

              ...(csvImporting ||

              saving ||

              importing

                ? styles.disabledButton

                : {}),

            }}

          >

            {csvImporting

              ? "Importing CSV..."

              : "📄 Import CSV"}

          </button>

          {/* DOWNLOAD TEMPLATE */}

          <button

            type="button"

            onClick={

              downloadCSVTemplate

            }

            disabled={

              saving ||

              importing ||

              csvImporting

            }

            style={{

              ...styles.templateButton,

              ...(saving ||

              importing ||

              csvImporting

                ? styles.disabledButton

                : {}),

            }}

          >

            ⬇ CSV Template

          </button>

        </div>

        {/* HIDDEN CSV INPUT */}

        <input

          ref={csvInputRef}

          type="file"

          accept=".csv,text/csv"

          onChange={

            handleCSVImport

          }

          style={{

            display: "none",

          }}

        />

      </div>

      {/* CUSTOMER LIST */}

      <div

        style={styles.listCard}

      >

        <div

          style={

            styles.listHeader

          }

        >

          <h2

            style={

              styles.listTitle

            }

          >

            Customer List

          </h2>

          <span

            style={

              styles.listCount

            }

          >

            Showing {

              filteredCustomers.length

            }

          </span>

        </div>

        {loading ? (

          <div

            style={

              styles.loading

            }

          >

            Loading customers...

          </div>

        ) : filteredCustomers.length === 0 ? (

          <div

            style={

              styles.empty

            }

          >

            <div

              style={

                styles.emptyIcon

              }

            >

              👥

            </div>

            <h3>

              No customers found

            </h3>

            <p>

              Add a customer or import customers

              from invoices or CSV.

            </p>

          </div>

        ) : (

          <div

            style={

              styles.tableContainer

            }

          >

            <table

              style={

                styles.table

              }

            >

              <thead>

                <tr>

                  <th

                    style={

                      styles.th

                    }

                  >

                    #

                  </th>

                  <th

                    style={

                      styles.th

                    }

                  >

                    To Address

                  </th>

                  <th

                    style={

                      styles.th

                    }

                  >

                    Site

                  </th>

                  <th

                    style={

                      styles.th

                    }

                  >

                    Actions

                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredCustomers.map(

                  (

                    customer,

                    index

                  ) => (

                    <tr

                      key={

                        customer.id

                      }

                    >

                      <td

                        style={

                          styles.td

                        }

                      >

                        {index + 1}

                      </td>

                      <td

                        style={{

                          ...styles.td,

                          ...styles.addressCell,

                        }}

                      >

                        {customer.to_address || (

                          <span

                            style={

                              styles.muted

                            }

                          >

                            —

                          </span>

                        )}

                      </td>

                      <td
                        style={{
                          ...styles.td,
                          ...styles.addressCell,
                        }}
                      >
                        {customer.site || (

                          <span

                            style={

                              styles.muted

                            }

                          >

                            —

                          </span>

                        )}

                      </td>

                      <td

                        style={

                          styles.td

                        }

                      >

                        <div

                          style={

                            styles.actionButtons

                          }

                        >

                          <button

                            type="button"

                            onClick={() =>

                              handleEdit(

                                customer

                              )

                            }

                            disabled={

                              saving

                            }

                            style={

                              styles.editButton

                            }

                          >

                            Edit

                          </button>

                          <button

                            type="button"

                            onClick={() =>

                              handleDelete(

                                customer

                              )

                            }

                            disabled={

                              saving

                            }

                            style={

                              styles.deleteButton

                            }

                          >

                            Delete

                          </button>

                        </div>

                      </td>

                    </tr>

                  )

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}

// =====================================

// STYLES

// =====================================

const styles = {

  container: {

    width: "100%",

    maxWidth: "1250px",

    margin: "0 auto",

    padding: "10px",

    boxSizing: "border-box",

  },

  header: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: "20px",

    marginBottom: "25px",

    flexWrap: "wrap",

  },

  title: {

    margin: 0,

    fontSize: "30px",

    color: "#111827",

  },

  subtitle: {

    margin: "6px 0 0",

    color: "#6b7280",

    fontSize: "14px",

  },

  countBadge: {

    padding: "9px 15px",

    borderRadius: "20px",

    background: "#e8f1ff",

    color: "#2563eb",

    fontSize: "14px",

    fontWeight: "700",

  },

  card: {

    background: "#ffffff",

    border: "1px solid #e5e7eb",

    borderRadius: "12px",

    padding: "22px",

    marginBottom: "20px",

    boxShadow:

      "0 2px 8px rgba(0,0,0,0.04)",

  },

  cardHeader: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: "20px",

  },

  cardTitle: {

    margin: 0,

    fontSize: "19px",

    color: "#1f2937",

  },

  editingBadge: {

    padding: "5px 10px",

    borderRadius: "20px",

    background: "#fff7ed",

    color: "#c2410c",

    fontSize: "12px",

    fontWeight: "700",

  },

  formRow: {

    display: "grid",

    gridTemplateColumns:

      "minmax(0, 2fr) minmax(250px, 1fr)",

    gap: "20px",

    alignItems: "start",

  },

  formGroup: {

    display: "flex",

    flexDirection: "column",

    gap: "8px",

  },

  label: {

    fontSize: "14px",

    fontWeight: "700",

    color: "#374151",

  },

  textarea: {

    width: "100%",

    padding: "12px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    fontSize: "14px",

    boxSizing: "border-box",

    minHeight: "94px",

    resize: "vertical",

    fontFamily: "inherit",

    outline: "none",

  },

  input: {

    width: "100%",

    padding: "12px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    fontSize: "14px",

    boxSizing: "border-box",

    fontFamily: "inherit",

    outline: "none",

  },

  formFooter: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: "20px",

    marginTop: "18px",

    flexWrap: "wrap",

  },

  helpText: {

    margin: 0,

    fontSize: "12px",

    color: "#6b7280",

    maxWidth: "600px",

  },

  buttonRow: {

    display: "flex",

    gap: "10px",

    flexWrap: "wrap",

  },

  primaryButton: {

    padding: "11px 18px",

    border: "none",

    borderRadius: "8px",

    background: "#2563eb",

    color: "#ffffff",

    fontSize: "14px",

    fontWeight: "700",

    cursor: "pointer",

  },

  secondaryButton: {

    padding: "11px 18px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    background: "#ffffff",

    color: "#374151",

    fontSize: "14px",

    fontWeight: "600",

    cursor: "pointer",

  },

  disabledButton: {

    opacity: 0.6,

    cursor: "not-allowed",

  },

  message: {

    padding: "13px 16px",

    borderRadius: "8px",

    marginBottom: "20px",

    fontSize: "14px",

    fontWeight: "600",

  },

  successMessage: {

    background: "#ecfdf5",

    color: "#047857",

    border: "1px solid #a7f3d0",

  },

  errorMessage: {

    background: "#fef2f2",

    color: "#b91c1c",

    border: "1px solid #fecaca",

  },

  infoMessage: {

    background: "#eff6ff",

    color: "#1d4ed8",

    border: "1px solid #bfdbfe",

  },

  toolbar: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: "15px",

    marginBottom: "15px",

    flexWrap: "wrap",

  },

  toolbarButtons: {

    display: "flex",

    gap: "10px",

    flexWrap: "wrap",

  },

  searchWrapper: {

    flex: "1",

    minWidth: "250px",

  },

  searchInput: {

    width: "100%",

    padding: "11px 14px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    fontSize: "14px",

    boxSizing: "border-box",

    outline: "none",

  },

  importButton: {

    padding: "11px 16px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    background: "#ffffff",

    color: "#374151",

    fontSize: "14px",

    fontWeight: "600",

    cursor: "pointer",

  },

  csvImportButton: {

    padding: "11px 16px",

    border: "none",

    borderRadius: "8px",

    background: "#2563eb",

    color: "#ffffff",

    fontSize: "14px",

    fontWeight: "600",

    cursor: "pointer",

  },

  templateButton: {

    padding: "11px 16px",

    border: "1px solid #d1d5db",

    borderRadius: "8px",

    background: "#ffffff",

    color: "#374151",

    fontSize: "14px",

    fontWeight: "600",

    cursor: "pointer",

  },

  listCard: {

    background: "#ffffff",

    border: "1px solid #e5e7eb",

    borderRadius: "12px",

    overflow: "hidden",

    boxShadow:

      "0 2px 8px rgba(0,0,0,0.04)",

  },

  listHeader: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    padding: "18px 20px",

    borderBottom:

      "1px solid #e5e7eb",

  },

  listTitle: {

    margin: 0,

    fontSize: "18px",

    color: "#1f2937",

  },

  listCount: {

    fontSize: "13px",

    color: "#6b7280",

  },

  tableContainer: {

    width: "100%",

    overflowX: "auto",

  },

  table: {

    width: "100%",

    minWidth: "750px",

    borderCollapse: "collapse",

  },

  th: {

    padding: "13px 15px",

    background: "#f9fafb",

    borderBottom:

      "1px solid #e5e7eb",

    textAlign: "left",

    fontSize: "12px",

    fontWeight: "700",

    color: "#6b7280",

    textTransform: "uppercase",

  },

  td: {

    padding: "14px 15px",

    borderBottom:

      "1px solid #f1f5f9",

    verticalAlign: "middle",

    fontSize: "14px",

    color: "#374151",

  },

  addressCell: {

    whiteSpace: "pre-wrap",

    lineHeight: "1.5",

    maxWidth: "500px",

  },

  muted: {

    color: "#9ca3af",

  },

  actionButtons: {

    display: "flex",

    gap: "8px",

  },

  editButton: {

    padding: "7px 12px",

    border: "1px solid #bfdbfe",

    borderRadius: "6px",

    background: "#eff6ff",

    color: "#2563eb",

    fontSize: "13px",

    fontWeight: "600",

    cursor: "pointer",

  },

  deleteButton: {

    padding: "7px 12px",

    border: "1px solid #fecaca",

    borderRadius: "6px",

    background: "#fef2f2",

    color: "#dc2626",

    fontSize: "13px",

    fontWeight: "600",

    cursor: "pointer",

  },

  loading: {

    padding: "50px",

    textAlign: "center",

    color: "#6b7280",

  },

  empty: {

    padding: "60px 20px",

    textAlign: "center",

    color: "#6b7280",

  },

  emptyIcon: {

    fontSize: "40px",

    marginBottom: "10px",

  },

};

export default Customers;