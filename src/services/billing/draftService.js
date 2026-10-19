// src/services/billing/draftService.js

const DB_NAME = "billing-app-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

// ============================================================
// OPEN DATABASE
// ============================================================

/**
 * Open the IndexedDB database used for unfinished billing drafts.
 *
 * IMPORTANT:
 * Drafts are stored only in the browser.
 * Supabase is NOT used for draft storage.
 */
function openDraftDatabase() {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof window === "undefined" ||
        !("indexedDB" in window)
      ) {
        reject(
          new Error(
            "IndexedDB is not supported by this browser."
          )
        );

        return;
      }

      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      // ========================================================
      // DATABASE UPGRADE / CREATE STORE
      // ========================================================

      request.onupgradeneeded = (
        event
      ) => {
        const db =
          event.target.result;

        let store;

        // ------------------------------------------------------
        // CREATE OBJECT STORE
        // ------------------------------------------------------

        if (
          !db.objectStoreNames.contains(
            STORE_NAME
          )
        ) {
          store =
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath: "id",
              }
            );
        } else {
          store =
            event.target.transaction.objectStore(
              STORE_NAME
            );
        }

        // ------------------------------------------------------
        // USER ID INDEX
        // ------------------------------------------------------

        if (
          !store.indexNames.contains(
            "userId"
          )
        ) {
          store.createIndex(
            "userId",
            "userId",
            {
              unique: false,
            }
          );
        }

        // ------------------------------------------------------
        // COMPANY ID INDEX
        // ------------------------------------------------------

        if (
          !store.indexNames.contains(
            "companyId"
          )
        ) {
          store.createIndex(
            "companyId",
            "companyId",
            {
              unique: false,
            }
          );
        }

        // ------------------------------------------------------
        // BILL TYPE INDEX
        // ------------------------------------------------------

        if (
          !store.indexNames.contains(
            "billType"
          )
        ) {
          store.createIndex(
            "billType",
            "billType",
            {
              unique: false,
            }
          );
        }

        // ------------------------------------------------------
        // UPDATED AT INDEX
        // ------------------------------------------------------

        if (
          !store.indexNames.contains(
            "updatedAt"
          )
        ) {
          store.createIndex(
            "updatedAt",
            "updatedAt",
            {
              unique: false,
            }
          );
        }

        // ------------------------------------------------------
        // IMPORTANT INDEX
        // ------------------------------------------------------

        if (
          !store.indexNames.contains(
            "isImportant"
          )
        ) {
          store.createIndex(
            "isImportant",
            "isImportant",
            {
              unique: false,
            }
          );
        }
      };

      // ========================================================
      // SUCCESS
      // ========================================================

      request.onsuccess = () => {
        const db =
          request.result;

        /*
         * If another tab upgrades the database,
         * close this connection.
         */
        db.onversionchange = () => {
          db.close();
        };

        resolve(db);
      };

      // ========================================================
      // ERROR
      // ========================================================

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Unable to open billing draft database."
            )
        );
      };

      // ========================================================
      // BLOCKED
      // ========================================================

      request.onblocked = () => {
        reject(
          new Error(
            "Billing draft database is blocked by another browser tab."
          )
        );
      };
    }
  );
}

// ============================================================
// CREATE UNIQUE DRAFT ID
// ============================================================

/**
 * Generate a unique ID for a new billing draft.
 *
 * This ID is generated when a new billing session starts.
 *
 * IMPORTANT:
 * Generating an ID does NOT create a draft in IndexedDB.
 *
 * The actual IndexedDB record is created only after meaningful
 * billing data is entered.
 */
export function createDraftId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

// ============================================================
// GET ALL DRAFTS
// ============================================================

/**
 * Get all drafts belonging to the current user.
 *
 * Drafts belonging to another user in the same browser are
 * never returned.
 */
export async function getAllDrafts({
  userId,
}) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const db =
    await openDraftDatabase();

  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.getAll();

      request.onsuccess = () => {
        const allDrafts =
          Array.isArray(
            request.result
          )
            ? request.result
            : [];

        const drafts =
          allDrafts
            .filter(
              (draft) =>
                String(draft?.userId || "") === String(userId) &&
                draft?.draftMode !== "edit"
            )
            .sort(
              (
                a,
                b
              ) => {
                const dateA =
                  new Date(
                    a?.updatedAt ||
                      0
                  ).getTime();

                const dateB =
                  new Date(
                    b?.updatedAt ||
                      0
                  ).getTime();

                return (
                  dateB -
                  dateA
                );
              }
            );

        resolve(
          drafts
        );
      };

      request.onerror = () => {
        if (!settled) {
          settled = true;

          reject(
            request.error ||
              new Error(
                "Unable to load billing drafts."
              )
          );
        }
      };

      transaction.oncomplete =
        () => {
          db.close();
        };

      transaction.onerror =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Unable to read billing drafts."
                )
            );
          }
        };

      transaction.onabort =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Reading billing drafts was cancelled."
                )
            );
          }
        };
    }
  );
}

// ============================================================
// GET ONE DRAFT
// ============================================================

/**
 * Get one exact draft by its unique ID.
 */
export async function getDraft(
  draftId
) {
  if (!draftId) {
    throw new Error(
      "Draft ID is required."
    );
  }

  const db =
    await openDraftDatabase();

  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.get(
          draftId
        );

      request.onsuccess =
        () => {
          resolve(
            request.result ||
              null
          );
        };

      request.onerror =
        () => {
          if (!settled) {
            settled = true;

            reject(
              request.error ||
                new Error(
                  "Unable to load the billing draft."
                )
            );
          }
        };

      transaction.oncomplete =
        () => {
          db.close();
        };

      transaction.onerror =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Unable to read the billing draft."
                )
            );
          }
        };

      transaction.onabort =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Reading the billing draft was cancelled."
                )
            );
          }
        };
    }
  );
}

// ============================================================
// SAVE / UPDATE DRAFT
// ============================================================

/**
 * Save a draft into IndexedDB.
 *
 * Same ID:
 *     updates the same draft.
 *
 * New ID:
 *     creates an independent draft.
 *
 * IMPORTANT:
 * This function does NOT decide whether the draft is meaningful.
 * The billing page calls hasMeaningfulDraftData() before calling
 * this function for automatic saves.
 */
export async function saveDraft(
  draft
) {
  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (
    !draft ||
    typeof draft !==
      "object"
  ) {
    throw new Error(
      "Draft data is required."
    );
  }

  if (!draft.id) {
    throw new Error(
      "Draft ID is required."
    );
  }

  if (!draft.userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!draft.companyId) {
    throw new Error(
      "Company ID is required."
    );
  }

  if (!draft.billType) {
    throw new Error(
      "Bill type is required."
    );
  }

  // ==========================================================
  // GET EXISTING DRAFT
  // ==========================================================

  /*
   * We need the old record so that properties such as
   * isImportant and createdAt can be preserved.
   */
  const existingDraft =
    await getDraft(
      draft.id
    );

  const now =
    new Date().toISOString();

  // ==========================================================
  // IMPORTANT FLAG
  // ==========================================================

  let isImportant;

  /*
   * If the incoming draft explicitly contains isImportant,
   * respect it.
   *
   * Otherwise preserve the previous value.
   *
   * If neither exists, default to false.
   */

  if (
    Object.prototype.hasOwnProperty.call(
      draft,
      "isImportant"
    )
  ) {
    isImportant =
      Boolean(
        draft.isImportant
      );
  } else if (
    existingDraft
  ) {
    isImportant =
      Boolean(
        existingDraft.isImportant
      );
  } else {
    isImportant =
      false;
  }

  // ==========================================================
  // CREATED TIME
  // ==========================================================

  const createdAt =
    existingDraft?.createdAt ||
    draft.createdAt ||
    now;

  // ==========================================================
  // BUILD RECORD
  // ==========================================================

  const draftToSave = {
    ...draft,

    id:
      draft.id,

    userId:
      draft.userId,

    companyId:
      draft.companyId,

    billType:
      draft.billType,

    isImportant,

    createdAt,

    updatedAt:
      now,
  };

  // ==========================================================
  // OPEN DATABASE
  // ==========================================================

  const db =
    await openDraftDatabase();

  // ==========================================================
  // WRITE
  // ==========================================================

  return new Promise(
    (resolve, reject) => {
      let completed =
        false;

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.put(
          draftToSave
        );

      request.onsuccess =
        () => {
          /*
           * The request succeeded.
           *
           * Resolve with the exact object that was stored.
           */
          resolve(
            draftToSave
          );
        };

      request.onerror =
        () => {
          reject(
            request.error ||
              new Error(
                "Unable to save billing draft."
              )
          );
        };

      transaction.oncomplete =
        () => {
          completed = true;
          db.close();
        };

      transaction.onerror =
        () => {
          if (!completed) {
            reject(
              transaction.error ||
                new Error(
                  "Unable to save billing draft."
                )
            );
          }

          db.close();
        };

      transaction.onabort =
        () => {
          if (!completed) {
            reject(
              transaction.error ||
                new Error(
                  "Billing draft save was cancelled."
                )
            );
          }

          db.close();
        };
    }
  );
}

// ============================================================
// DELETE ONE EXACT DRAFT
// ============================================================

/**
 * Delete one exact draft.
 *
 * This is called after the corresponding permanent invoice
 * has successfully been saved.
 */
export async function deleteDraft(
  draftId
) {
  if (!draftId) {
    throw new Error(
      "Draft ID is required."
    );
  }

  const db =
    await openDraftDatabase();

  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.delete(
          draftId
        );

      request.onsuccess =
        () => {
          resolve(
            true
          );
        };

      request.onerror =
        () => {
          if (!settled) {
            settled = true;

            reject(
              request.error ||
                new Error(
                  "Unable to delete billing draft."
                )
            );
          }
        };

      transaction.oncomplete =
        () => {
          db.close();
        };

      transaction.onerror =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Unable to delete billing draft."
                )
            );
          }
        };

      transaction.onabort =
        () => {
          if (!settled) {
            settled = true;

            reject(
              transaction.error ||
                new Error(
                  "Billing draft deletion was cancelled."
                )
            );
          }
        };
    }
  );
}

// ============================================================
// FIND MATCHING DRAFTS
// ============================================================

/**
 * Find all drafts for:
 *
 * same user
 * same company
 * same bill type
 *
 * Customer is intentionally NOT included.
 *
 * Multiple drafts with the same company + bill type are allowed.
 */
export async function findDraftsByCompanyAndBillType({
  userId,
  companyId,
  billType,
}) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!companyId) {
    throw new Error(
      "Company ID is required."
    );
  }

  if (!billType) {
    throw new Error(
      "Bill type is required."
    );
  }

  const drafts =
    await getAllDrafts({
      userId,
    });

  return drafts
    .filter(
      (draft) =>
        String(
          draft?.userId ||
            ""
        ) ===
          String(
            userId
          ) &&
        String(
          draft?.companyId ||
            ""
        ) ===
          String(
            companyId
          ) &&
        String(
          draft?.billType ||
            ""
        ) ===
          String(
            billType
          )
    )
    .sort(
      (
        a,
        b
      ) => {
        const dateA =
          new Date(
            a?.updatedAt ||
              0
          ).getTime();

        const dateB =
          new Date(
            b?.updatedAt ||
              0
          ).getTime();

        return (
          dateB -
          dateA
        );
      }
    );
}

// ============================================================
// MEANINGFUL DATA CHECK
// ============================================================

/**
 * Determine whether a billing session contains actual user
 * entered/selected billing information.
 *
 * IMPORTANT:
 *
 * The following alone DO NOT create a draft:
 *
 * - company
 * - company ID
 * - bill number
 * - bill date
 * - default GST 9%
 * - default CGST 9%
 * - zero subtotal
 * - zero total
 *
 * The following CAN create a draft:
 *
 * - To
 * - Site
 * - selected customer
 * - selected bank
 * - selected signature
 * - product/manual row
 * - quantity/rate/particular
 * - changed GST percentage
 * - rounded total
 * - notes
 */
export function hasMeaningfulDraftData(
  draft
) {
  if (
    !draft ||
    typeof draft !==
      "object"
  ) {
    return false;
  }

  // ==========================================================
  // TO / CUSTOMER ADDRESS
  // ==========================================================

  const customerTo =
    draft.customerTo ??
    draft.customer_to ??
    draft.toAddress ??
    draft.customer?.to_address ??
    draft.customer?.toAddress ??
    "";

  if (
    typeof customerTo ===
      "string" &&
    customerTo.trim()
  ) {
    return true;
  }

  // ==========================================================
  // SITE
  // ==========================================================

  const customerSite =
    draft.customerSite ??
    draft.customer_site ??
    draft.site ??
    draft.customer?.site ??
    "";

  if (
    typeof customerSite ===
      "string" &&
    customerSite.trim()
  ) {
    return true;
  }

  // ==========================================================
  // CUSTOMER SELECTED
  // ==========================================================

  /*
   * Selecting an existing customer is meaningful even if the
   * current To/Site fields happen to be empty.
   */

  if (
    draft.customerId ||
    draft.customer?.id
  ) {
    return true;
  }

  // ==========================================================
  // BANK SELECTED
  // ==========================================================

  if (
    draft.bankId ||
    draft.bank
  ) {
    return true;
  }

  // ==========================================================
  // SIGNATURE SELECTED
  // ==========================================================

  if (
    draft.signaturePath ||
    draft.signature_path ||
    draft.signature
  ) {
    return true;
  }

  // ==========================================================
  // NOTES
  // ==========================================================

  if (
    typeof draft.notes ===
      "string" &&
    draft.notes.trim()
  ) {
    return true;
  }

  // ==========================================================
  // ITEMS
  // ==========================================================

  if (
    Array.isArray(
      draft.items
    ) &&
    draft.items.length > 0
  ) {
    for (
      const item of draft.items
    ) {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        continue;
      }

      // ------------------------------------------------------
      // PRODUCT SELECTED
      // ------------------------------------------------------

      if (
        item.productId !==
          null &&
        item.productId !==
          undefined &&
        String(
          item.productId
        ).trim() !== ""
      ) {
        return true;
      }

      // ------------------------------------------------------
      // PARTICULAR
      // ------------------------------------------------------

      if (
        typeof item.particular ===
          "string" &&
        item.particular.trim()
      ) {
        return true;
      }

      // ------------------------------------------------------
      // ITEM NOTES
      // ------------------------------------------------------

      if (
        typeof item.notes ===
          "string" &&
        item.notes.trim()
      ) {
        return true;
      }

      // ------------------------------------------------------
      // QUANTITY
      // ------------------------------------------------------

      if (
        item.qty !==
          null &&
        item.qty !==
          undefined &&
        String(
          item.qty
        ).trim() !== ""
      ) {
        return true;
      }

      // ------------------------------------------------------
      // RATE
      // ------------------------------------------------------

      if (
        item.rate !==
          null &&
        item.rate !==
          undefined &&
        String(
          item.rate
        ).trim() !== ""
      ) {
        return true;
      }

      // ------------------------------------------------------
      // AMOUNT
      // ------------------------------------------------------

      if (
        item.amount !==
          null &&
        item.amount !==
          undefined &&
        String(
          item.amount
        ).trim() !== ""
      ) {
        return true;
      }
    }
  }

  // ==========================================================
  // GST
  // ==========================================================

  /*
   * DEFAULT GST VALUES:
   *
   * SGST = 9
   * CGST = 9
   *
   * These are automatically present when GST billing opens,
   * therefore they are NOT meaningful.
   *
   * If the user changes either percentage to something else,
   * then it becomes meaningful.
   */

  if (
    String(
      draft.billType ||
        ""
    ).toLowerCase() ===
    "gst"
  ) {
    const sgst =
      Number(
        draft.sgstRate
      );

    const cgst =
      Number(
        draft.cgstRate
      );

    const effectiveSgst =
      Number.isFinite(
        sgst
      )
        ? sgst
        : 9;

    const effectiveCgst =
      Number.isFinite(
        cgst
      )
        ? cgst
        : 9;

    if (
      effectiveSgst !==
        9 ||
      effectiveCgst !==
        9
    ) {
      return true;
    }

    /*
     * GST amounts are only meaningful when there are actual
     * product items. They should not independently create a
     * blank draft because they are calculated values.
     */
  } else {
    /*
     * For non-GST billing, GST values are not relevant.
     *
     * Do not use them to determine meaningful data.
     */
  }

  // ==========================================================
  // ROUND TOTAL
  // ==========================================================

  if (
    draft.isRounded ===
      true ||
    draft.roundTotal ===
      true
  ) {
    return true;
  }

  // ==========================================================
  // DO NOT CHECK:
  //
  // billNumber
  // billDate
  // company
  // companyName
  // companyGstNo
  // subtotal
  // grandTotal
  // amountInWords
  //
  // Those can be automatically generated/calculated.
  // ==========================================================

  return false;
}

// ============================================================
// DELETE ALL USER DRAFTS
// ============================================================

/**
 * Delete all drafts belonging to one user.
 *
 * Used only when explicitly required by the application.
 */
export async function deleteAllDraftsForUser(
  userId
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const drafts =
    await getAllDrafts({
      userId,
    });

  if (
    drafts.length ===
    0
  ) {
    return 0;
  }

  const db =
    await openDraftDatabase();

  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      // --------------------------------------------------------
      // DELETE ONLY THIS USER'S DRAFTS
      // --------------------------------------------------------

      for (
        const draft of drafts
      ) {
        if (
          draft?.id
        ) {
          store.delete(
            draft.id
          );
        }
      }

      // --------------------------------------------------------
      // COMPLETE
      // --------------------------------------------------------

      transaction.oncomplete =
        () => {
          db.close();

          resolve(
            drafts.length
          );
        };

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      transaction.onerror =
        () => {
          if (!settled) {
            settled = true;

            db.close();

            reject(
              transaction.error ||
                new Error(
                  "Unable to delete user billing drafts."
                )
            );
          }
        };

      // --------------------------------------------------------
      // ABORT
      // --------------------------------------------------------

      transaction.onabort =
        () => {
          if (!settled) {
            settled = true;

            db.close();

            reject(
              transaction.error ||
                new Error(
                  "Deleting billing drafts was cancelled."
                )
            );
          }
        };
    }
  );
}