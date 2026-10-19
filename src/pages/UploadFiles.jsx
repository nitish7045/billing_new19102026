import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const SIGNATURE_BUCKET = "signatures";
const TEMPLATE_BUCKET = "templates";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const BILL_TYPES = [
  {
    value: "normal",
    label: "Normal Bill",
    description: "Standard non-GST bill",
  },
  {
    value: "gst",
    label: "GST Tax Invoice",
    description: "GST tax invoice",
  },
  {
    value: "corecutting",
    label: "Core Cutting",
    description: "Core cutting bill",
  },
  {
    value: "challan",
    label: "Challan",
    description: "Normal / GST challan",
  },
];

function UploadFiles() {
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");

  // =====================================
  // SIGNATURE PREVIEW
  // =====================================

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // =====================================
  // TEMPLATE UPLOAD MODAL
  // =====================================

  const [showTemplateModal, setShowTemplateModal] =
    useState(false);

  const [selectedTemplateType, setSelectedTemplateType] =
    useState("normal");

  const [setTemplateAsDefault, setSetTemplateAsDefault] =
    useState(true);

  const [selectedTemplateFile, setSelectedTemplateFile] =
    useState(null);

  // =====================================
  // ASSIGN EXISTING TEMPLATE MODAL
  // =====================================

  const [templateToAssign, setTemplateToAssign] =
    useState(null);

  const [assignTemplateType, setAssignTemplateType] =
    useState("normal");

  const [assignAsDefault, setAssignAsDefault] =
    useState(false);

  const signatureInputRef = useRef(null);
  const templateInputRef = useRef(null);

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
      throw new Error("User not logged in.");
    }

    return user;
  }

  // =====================================
  // BILL TYPE NAME
  // =====================================

  function getBillTypeName(type) {
    const found = BILL_TYPES.find(
      (item) => item.value === type
    );

    return found?.label || "Not Assigned";
  }

  // =====================================
  // LOAD FILES
  // =====================================

  async function loadFiles() {
    try {
      setLoading(true);

      const user = await getCurrentUser();

      const {
        data,
        error,
      } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setFiles(data || []);
    } catch (error) {
      console.error(
        "Load files error:",
        error
      );

      setMessage(
        `❌ Failed to load files: ${
          error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // INITIAL LOAD
  // =====================================

  useEffect(() => {
    loadFiles();
  }, []);

  // =====================================
  // OPEN TEMPLATE UPLOAD
  // =====================================

  function openTemplateUpload() {
    setMessage("");

    setSelectedTemplateFile(null);

    setSelectedTemplateType("normal");

    setSetTemplateAsDefault(true);

    setShowTemplateModal(true);
  }

  // =====================================
  // CLOSE TEMPLATE UPLOAD
  // =====================================

  function closeTemplateModal() {
    if (uploading) {
      return;
    }

    setShowTemplateModal(false);

    setSelectedTemplateFile(null);

    if (templateInputRef.current) {
      templateInputRef.current.value = "";
    }
  }

  // =====================================
  // SELECT TEMPLATE FILE
  // =====================================

  function handleTemplateFileSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");

    const isDocx =
      file.name
        .toLowerCase()
        .endsWith(".docx");

    if (!isDocx) {
      setMessage(
        "❌ Please upload a DOCX template file."
      );

      event.target.value = "";

      setSelectedTemplateFile(null);

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(
        "❌ Template file must be smaller than 10 MB."
      );

      event.target.value = "";

      setSelectedTemplateFile(null);

      return;
    }

    setSelectedTemplateFile(file);
  }

  // =====================================
  // UPLOAD SIGNATURE
  // =====================================


  // =====================================
  // UPLOAD SIGNATURE — SUPPORT MULTIPLE
  // =====================================

  async function handleSignatureUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "❌ Please upload a PNG, JPG, JPEG or WEBP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "❌ Signature image must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    let storagePath = "";

    try {
      setUploading(true);

      const user = await getCurrentUser();

      // Create a unique filename for every signature.
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const fileName =
        `signature-${Date.now()}-${crypto.randomUUID()}.${extension}`;

      storagePath = `${user.id}/${fileName}`;

      // Upload the new signature WITHOUT deleting existing signatures.
      const { error: uploadError } = await supabase.storage
        .from(SIGNATURE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Insert a separate database record for this signature.
      const { error: databaseError } = await supabase
        .from("uploaded_files")
        .insert({
          user_id: user.id,
          file_type: "signature",
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          template_bill_type: null,
          is_default: false,
        });

      if (databaseError) {
        // Roll back the newly uploaded image if saving its
        // database record fails. Keep all previous signatures.
        await supabase.storage
          .from(SIGNATURE_BUCKET)
          .remove([storagePath]);

        storagePath = "";
        throw databaseError;
      }

      setMessage("✅ Signature uploaded successfully.");

      // Refresh the list so all saved signatures appear.
      await loadFiles();
    } catch (error) {
      console.error("Signature upload error:", error);

      setMessage(
        `❌ Failed to upload signature: ${error.message}`
      );
    } finally {
      setUploading(false);

      if (signatureInputRef.current) {
        signatureInputRef.current.value = "";
      }
    }
  }


  // =====================================
  // UPLOAD TEMPLATE
  // =====================================

  async function handleTemplateUpload() {
    if (!selectedTemplateFile) {
      setMessage(
        "❌ Please select a DOCX template."
      );

      return;
    }

    if (!selectedTemplateType) {
      setMessage(
        "❌ Please select the bill type."
      );

      return;
    }

    try {
      setUploading(true);

      setMessage("");

      const user = await getCurrentUser();

      const file =
        selectedTemplateFile;

      // =====================================
      // SAFE FILE NAME
      // =====================================

      const safeFileName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      // =====================================
      // UNIQUE STORAGE PATH
      // =====================================

      const storagePath =
        `${user.id}/${Date.now()}-${safeFileName}`;

      // =====================================
      // IF DEFAULT
      // REMOVE OLD DEFAULT
      // =====================================

      if (setTemplateAsDefault) {
        const {
          error: resetError,
        } = await supabase
          .from("uploaded_files")
          .update({
            is_default: false,
          })
          .eq("user_id", user.id)
          .eq("file_type", "template")
          .eq(
            "template_bill_type",
            selectedTemplateType
          )
          .eq("is_default", true);

        if (resetError) {
          throw resetError;
        }
      }

      // =====================================
      // UPLOAD TO STORAGE
      // =====================================

      const {
        error: uploadError,
      } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .upload(
          storagePath,
          file,
          {
            contentType:
              file.type || DOCX_MIME,

            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      // =====================================
      // SAVE DATABASE RECORD
      // =====================================

      const {
        error: databaseError,
      } = await supabase
        .from("uploaded_files")
        .insert({
          user_id: user.id,

          file_type: "template",

          file_name: file.name,

          storage_path: storagePath,

          mime_type:
            file.type || DOCX_MIME,

          file_size: file.size,

          template_bill_type:
            selectedTemplateType,

          is_default:
            Boolean(setTemplateAsDefault),
        });

      if (databaseError) {
        // Remove uploaded file if DB insert failed.
        await supabase.storage
          .from(TEMPLATE_BUCKET)
          .remove([
            storagePath,
          ]);

        throw databaseError;
      }

      setMessage(
        setTemplateAsDefault
          ? `✅ Template uploaded and set as the default ${getBillTypeName(
              selectedTemplateType
            )} template.`
          : "✅ Template uploaded successfully."
      );

      setShowTemplateModal(false);

      setSelectedTemplateFile(null);

      if (templateInputRef.current) {
        templateInputRef.current.value = "";
      }

      await loadFiles();
    } catch (error) {
      console.error(
        "Template upload error:",
        error
      );

      setMessage(
        `❌ Failed to upload template: ${
          error.message
        }`
      );
    } finally {
      setUploading(false);
    }
  }

  // =====================================
  // GET SIGNED URL
  // =====================================

  async function getFileUrl(file) {
    const bucket =
      file.file_type === "signature"
        ? SIGNATURE_BUCKET
        : TEMPLATE_BUCKET;

    const {
      data,
      error,
    } = await supabase.storage
      .from(bucket)
      .createSignedUrl(
        file.storage_path,
        60 * 10
      );

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error(
        "Unable to create file URL."
      );
    }

    return data.signedUrl;
  }

  // =====================================
  // VIEW FILE
  // =====================================

  async function handleView(file) {
    setMessage("");

    try {
      const url =
        await getFileUrl(file);

      // =====================================
      // SIGNATURE
      // =====================================

      if (
        file.file_type === "signature"
      ) {
        setPreviewFile(file);

        setPreviewUrl(url);

        return;
      }

      // =====================================
      // TEMPLATE
      // =====================================

      setMessage(
        "ℹ️ DOCX files cannot be previewed directly in most browsers. Use Download to open the template in Microsoft Word."
      );
    } catch (error) {
      console.error(
        "View file error:",
        error
      );

      setMessage(
        `❌ Unable to open file: ${
          error.message
        }`
      );
    }
  }

  // =====================================
  // DOWNLOAD FILE
  // =====================================

  async function handleDownload(file) {
    setMessage("");

    try {
      const url =
        await getFileUrl(file);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        file.file_name;

      link.target = "_blank";

      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (error) {
      console.error(
        "Download file error:",
        error
      );

      setMessage(
        `❌ Unable to download file: ${
          error.message
        }`
      );
    }
  }

  // =====================================
  // CLOSE PREVIEW
  // =====================================

  function closePreview() {
    setPreviewFile(null);

    setPreviewUrl("");
  }

  // =====================================
  // RENAME FILE
  // =====================================

  async function handleRename(file) {
    const newName =
      window.prompt(
        "Enter new file name:",
        file.file_name
      );

    if (!newName?.trim()) {
      return;
    }

    const trimmedName =
      newName.trim();

    // =====================================
    // TEMPLATE NAME
    // =====================================

    if (
      file.file_type === "template"
    ) {
      if (
        !trimmedName
          .toLowerCase()
          .endsWith(".docx")
      ) {
        setMessage(
          "❌ Template file name must end with .docx."
        );

        return;
      }
    }

    try {
      const user =
        await getCurrentUser();

      const {
        error,
      } = await supabase
        .from("uploaded_files")
        .update({
          file_name:
            trimmedName,
        })
        .eq("id", file.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMessage(
        "✅ File renamed successfully."
      );

      await loadFiles();
    } catch (error) {
      console.error(
        "Rename error:",
        error
      );

      setMessage(
        `❌ Failed to rename file: ${
          error.message
        }`
      );
    }
  }

  // =====================================
  // SET DEFAULT TEMPLATE
  // =====================================

  async function handleSetDefault(file) {
    if (
      file.file_type !== "template"
    ) {
      return;
    }

    if (!file.template_bill_type) {
      setTemplateToAssign(file);

      setAssignTemplateType(
        "normal"
      );

      setAssignAsDefault(true);

      return;
    }

    try {
      setMessage("");

      const user =
        await getCurrentUser();

      // =====================================
      // REMOVE CURRENT DEFAULT
      // =====================================

      const {
        error: resetError,
      } = await supabase
        .from("uploaded_files")
        .update({
          is_default: false,
        })
        .eq("user_id", user.id)
        .eq("file_type", "template")
        .eq(
          "template_bill_type",
          file.template_bill_type
        )
        .eq("is_default", true);

      if (resetError) {
        throw resetError;
      }

      // =====================================
      // SET NEW DEFAULT
      // =====================================

      const {
        error: setError,
      } = await supabase
        .from("uploaded_files")
        .update({
          is_default: true,
        })
        .eq("id", file.id)
        .eq("user_id", user.id);

      if (setError) {
        throw setError;
      }

      setMessage(
        `✅ "${file.file_name}" is now the default ${getBillTypeName(
          file.template_bill_type
        )} template.`
      );

      await loadFiles();
    } catch (error) {
      console.error(
        "Set default template error:",
        error
      );

      setMessage(
        `❌ Failed to set default template: ${
          error.message
        }`
      );
    }
  }

  // =====================================
  // OPEN ASSIGN TEMPLATE MODAL
  // =====================================

  function openAssignTemplate(file) {
    setMessage("");

    setTemplateToAssign(file);

    setAssignTemplateType(
      file.template_bill_type ||
        "normal"
    );

    setAssignAsDefault(
      Boolean(file.is_default)
    );
  }

  // =====================================
  // CLOSE ASSIGN MODAL
  // =====================================

  function closeAssignTemplate() {
    if (uploading) {
      return;
    }

    setTemplateToAssign(null);
  }

  // =====================================
  // SAVE TEMPLATE TYPE
  // =====================================

  async function handleAssignTemplate() {
    if (!templateToAssign) {
      return;
    }

    try {
      setUploading(true);

      setMessage("");

      const user =
        await getCurrentUser();

      // =====================================
      // REMOVE CURRENT DEFAULT
      // =====================================

      if (assignAsDefault) {
        const {
          error: resetError,
        } = await supabase
          .from("uploaded_files")
          .update({
            is_default: false,
          })
          .eq("user_id", user.id)
          .eq("file_type", "template")
          .eq(
            "template_bill_type",
            assignTemplateType
          )
          .eq("is_default", true);

        if (resetError) {
          throw resetError;
        }
      }

      // =====================================
      // UPDATE TEMPLATE
      // =====================================

      const {
        error,
      } = await supabase
        .from("uploaded_files")
        .update({
          template_bill_type:
            assignTemplateType,

          is_default:
            Boolean(assignAsDefault),
        })
        .eq(
          "id",
          templateToAssign.id
        )
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMessage(
        assignAsDefault
          ? `✅ Template assigned to ${getBillTypeName(
              assignTemplateType
            )} and set as default.`
          : `✅ Template assigned to ${getBillTypeName(
              assignTemplateType
            )}.`
      );

      setTemplateToAssign(null);

      await loadFiles();
    } catch (error) {
      console.error(
        "Assign template error:",
        error
      );

      setMessage(
        `❌ Failed to update template: ${
          error.message
        }`
      );
    } finally {
      setUploading(false);
    }
  }

  // =====================================
  // DELETE FILE
  // =====================================

  async function handleDelete(file) {
    const isDefault =
      file.file_type === "template" &&
      file.is_default;

    let confirmMessage =
      `Delete "${file.file_name}"?`;

    if (isDefault) {
      confirmMessage =
        `"${
          file.file_name
        }" is currently the default ${getBillTypeName(
          file.template_bill_type
        )} template.\n\nAre you sure you want to delete it?`;
    }

    const confirmed =
      window.confirm(
        confirmMessage
      );

    if (!confirmed) {
      return;
    }

    try {
      setUploading(true);

      const user =
        await getCurrentUser();

      const bucket =
        file.file_type === "signature"
          ? SIGNATURE_BUCKET
          : TEMPLATE_BUCKET;

      // =====================================
      // DELETE STORAGE FILE
      // =====================================

      const {
        error: storageError,
      } = await supabase.storage
        .from(bucket)
        .remove([
          file.storage_path,
        ]);

      if (storageError) {
        throw storageError;
      }

      // =====================================
      // DELETE DATABASE RECORD
      // =====================================

      const {
        error: databaseError,
      } = await supabase
        .from("uploaded_files")
        .delete()
        .eq("id", file.id)
        .eq("user_id", user.id);

      if (databaseError) {
        throw databaseError;
      }

      setMessage(
        isDefault
          ? "✅ Default template deleted successfully. Please select another default template if required."
          : "✅ File deleted successfully."
      );

      await loadFiles();
    } catch (error) {
      console.error(
        "Delete file error:",
        error
      );

      setMessage(
        `❌ Failed to delete file: ${
          error.message
        }`
      );
    } finally {
      setUploading(false);
    }
  }

  // =====================================
  // FORMAT FILE SIZE
  // =====================================

  function formatFileSize(bytes) {
    if (!bytes) {
      return "0 Bytes";
    }

    const units = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];

    const index = Math.min(
      Math.floor(
        Math.log(bytes) /
          Math.log(1024)
      ),
      units.length - 1
    );

    return `${(
      bytes /
      Math.pow(1024, index)
    ).toFixed(2)} ${units[index]}`;
  }

  // =====================================
  // FILTER FILES
  // =====================================

  const signatures =
    files.filter(
      (file) =>
        file.file_type ===
        "signature"
    );

  const templates =
    files.filter(
      (file) =>
        file.file_type ===
        "template"
    );

  // =====================================
  // DEFAULT TEMPLATE SUMMARY
  // =====================================

  const defaultTemplates =
    BILL_TYPES.map(
      (type) => ({
        ...type,

        template:
          templates.find(
            (file) =>
              file.template_bill_type ===
                type.value &&
              file.is_default === true
          ),
      })
    );

  // =====================================
  // UI
  // =====================================

  return (
    <>
      <div style={styles.container}>

        {/* =====================================
            HEADER
        ===================================== */}

        <div style={styles.header}>

          <div>
            <h1 style={styles.title}>
              📁 Manage Uploads
            </h1>

            <p style={styles.subtitle}>
              Manage your signature and billing
              templates used during bill creation.
            </p>
          </div>

          <div style={styles.headerButtons}>

            {/* SIGNATURE */}

            <button
              type="button"
              onClick={() =>
                signatureInputRef.current?.click()
              }
              disabled={uploading}
              style={{
                ...styles.signatureButton,

                ...(uploading
                  ? styles.disabledButton
                  : {}),
              }}
            >
              ✍ Upload Signature
            </button>

            <input
              ref={signatureInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleSignatureUpload}
              style={{
                display: "none",
              }}
            />

            {/* TEMPLATE */}

            <button
              type="button"
              onClick={openTemplateUpload}
              disabled={uploading}
              style={{
                ...styles.templateButton,

                ...(uploading
                  ? styles.disabledButton
                  : {}),
              }}
            >
              📄 Upload Template
            </button>

          </div>

        </div>

        {/* =====================================
            MESSAGE
        ===================================== */}

        {message && (
          <div
            style={{
              ...styles.message,

              ...(message.startsWith("❌")
                ? styles.errorMessage
                : styles.infoMessage),
            }}
          >
            {message}
          </div>
        )}

        {/* =====================================
            UPLOADING
        ===================================== */}

        {uploading && (
          <div style={styles.uploadingBox}>
            ⏳ Processing...
          </div>
        )}

        {/* =====================================
            DEFAULT TEMPLATE SUMMARY
        ===================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>
              <h2 style={styles.sectionTitle}>
                ⚙ Default Bill Templates
              </h2>

              <p style={styles.sectionDescription}>
                These templates will be automatically
                used when creating a new bill.
              </p>
            </div>

          </div>

          <div style={styles.defaultGrid}>

            {defaultTemplates.map(
              (type) => (
                <div
                  key={type.value}
                  style={
                    type.template
                      ? styles.defaultCard
                      : styles.defaultCardEmpty
                  }
                >

                  <div style={styles.defaultCardIcon}>
                    {type.value === "normal"
                      ? "🧾"
                      : type.value === "gst"
                      ? "📑"
                      : type.value ===
                        "corecutting"
                      ? "⚙️"
                      : "🚚"}
                  </div>

                  <div style={styles.defaultCardContent}>

                    <div style={styles.defaultCardTitle}>
                      {type.label}
                    </div>

                    {type.template ? (
                      <>
                        <div
                          style={
                            styles.defaultCardFile
                          }
                        >
                          {type.template.file_name}
                        </div>

                        <div
                          style={
                            styles.defaultBadge
                          }
                        >
                          ⭐ Default
                        </div>
                      </>
                    ) : (
                      <div
                        style={
                          styles.notConfigured
                        }
                      >
                        No default selected
                      </div>
                    )}

                  </div>

                </div>
              )
            )}

          </div>

        </section>

        {/* =====================================
            SIGNATURES
        ===================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>
              <h2 style={styles.sectionTitle}>
                ✍ Signature Images
              </h2>

              <p style={styles.sectionDescription}>
                Your active signature used on bills.
              </p>
            </div>

            <span style={styles.countBadge}>
              {signatures.length}
            </span>

          </div>

          {loading ? (

            <div style={styles.empty}>
              Loading signatures...
            </div>

          ) : signatures.length === 0 ? (

            <div style={styles.empty}>

              <div style={styles.emptyIcon}>
                ✍
              </div>

              <strong>
                No signature uploaded
              </strong>

              <p>
                Upload a signature image to use it
                in bills.
              </p>

            </div>

          ) : (

            <div style={styles.fileList}>

              {signatures.map(
                (file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onView={handleView}
                    onDownload={handleDownload}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                    onAssignTemplate={
                      openAssignTemplate
                    }
                    formatFileSize={
                      formatFileSize
                    }
                    getBillTypeName={
                      getBillTypeName
                    }
                    disabled={uploading}
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* =====================================
            TEMPLATES
        ===================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>
              <h2 style={styles.sectionTitle}>
                📄 Bill Templates
              </h2>

              <p style={styles.sectionDescription}>
                Upload multiple DOCX templates and
                choose a different default for each
                bill type.
              </p>
            </div>

            <span style={styles.countBadge}>
              {templates.length}
            </span>

          </div>

          {loading ? (

            <div style={styles.empty}>
              Loading templates...
            </div>

          ) : templates.length === 0 ? (

            <div style={styles.empty}>

              <div style={styles.emptyIcon}>
                📄
              </div>

              <strong>
                No templates uploaded
              </strong>

              <p>
                Upload your first DOCX billing template.
              </p>

              <button
                type="button"
                onClick={openTemplateUpload}
                style={styles.emptyUploadButton}
              >
                + Upload Template
              </button>

            </div>

          ) : (

            <div style={styles.fileList}>

              {templates.map(
                (file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onView={handleView}
                    onDownload={handleDownload}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                    onAssignTemplate={
                      openAssignTemplate
                    }
                    formatFileSize={
                      formatFileSize
                    }
                    getBillTypeName={
                      getBillTypeName
                    }
                    disabled={uploading}
                  />
                )
              )}

            </div>

          )}

        </section>

      </div>

      {/* =====================================
          SIGNATURE PREVIEW MODAL
      ===================================== */}

      {previewFile && previewUrl && (

        <div
          style={styles.modalOverlay}
          onClick={closePreview}
        >

          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div style={styles.modalHeader}>

              <div>
                <h3 style={styles.modalTitle}>
                  🖼 Signature Preview
                </h3>

                <p style={styles.modalFileName}>
                  {previewFile.file_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                style={styles.closeButton}
              >
                ✕
              </button>

            </div>

            <div
              style={
                styles.imagePreviewContainer
              }
            >

              <img
                src={previewUrl}
                alt={
                  previewFile.file_name
                }
                style={
                  styles.previewImage
                }
              />

            </div>

            <div style={styles.modalActions}>

              <button
                type="button"
                onClick={async () => {
                  await handleDownload(
                    previewFile
                  );
                }}
                style={
                  styles.downloadButton
                }
              >
                ⬇ Download
              </button>

              <button
                type="button"
                onClick={closePreview}
                style={
                  styles.closeModalButton
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================
          UPLOAD TEMPLATE MODAL
      ===================================== */}

      {showTemplateModal && (

        <div
          style={styles.modalOverlay}
          onClick={closeTemplateModal}
        >

          <div
            style={styles.templateModal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div style={styles.modalHeader}>

              <div>
                <h3 style={styles.modalTitle}>
                  📄 Upload Bill Template
                </h3>

                <p style={styles.modalFileName}>
                  Choose the bill type and default
                  setting for this DOCX template.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTemplateModal}
                disabled={uploading}
                style={styles.closeButton}
              >
                ✕
              </button>

            </div>

            <div
              style={
                styles.templateModalBody
              }
            >

              {/* FILE */}

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  DOCX Template
                </label>

                <button
                  type="button"
                  onClick={() =>
                    templateInputRef.current?.click()
                  }
                  disabled={uploading}
                  style={
                    styles.chooseFileButton
                  }
                >
                  📄 Choose DOCX File
                </button>

                <input
                  ref={templateInputRef}
                  type="file"
                  accept=".docx"
                  onChange={
                    handleTemplateFileSelect
                  }
                  style={{
                    display: "none",
                  }}
                />

                {selectedTemplateFile && (

                  <div
                    style={
                      styles.selectedFileBox
                    }
                  >

                    <div
                      style={
                        styles.selectedFileIcon
                      }
                    >
                      📄
                    </div>

                    <div
                      style={
                        styles.selectedFileInfo
                      }
                    >

                      <div
                        style={
                          styles.selectedFileName
                        }
                      >
                        {
                          selectedTemplateFile.name
                        }
                      </div>

                      <div
                        style={
                          styles.selectedFileSize
                        }
                      >
                        {formatFileSize(
                          selectedTemplateFile.size
                        )}
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateFile(
                          null
                        );

                        if (
                          templateInputRef.current
                        ) {
                          templateInputRef.current.value =
                            "";
                        }
                      }}
                      disabled={uploading}
                      style={
                        styles.removeFileButton
                      }
                    >
                      ✕
                    </button>

                  </div>

                )}

              </div>

              {/* BILL TYPE */}

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  Template For
                </label>

                <select
                  value={
                    selectedTemplateType
                  }
                  onChange={(event) =>
                    setSelectedTemplateType(
                      event.target.value
                    )
                  }
                  disabled={uploading}
                  style={styles.select}
                >

                  {BILL_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}

                </select>

                <div
                  style={
                    styles.formHint
                  }
                >
                  {
                    BILL_TYPES.find(
                      (type) =>
                        type.value ===
                        selectedTemplateType
                    )?.description
                  }
                </div>

              </div>

              {/* DEFAULT */}

              <label
                style={
                  styles.defaultCheckboxRow
                }
              >

                <input
                  type="checkbox"
                  checked={
                    setTemplateAsDefault
                  }
                  onChange={(event) =>
                    setSetTemplateAsDefault(
                      event.target.checked
                    )
                  }
                  disabled={uploading}
                  style={
                    styles.checkbox
                  }
                />

                <span>
                  <strong>
                    Make this the default template
                  </strong>

                  <small
                    style={
                      styles.checkboxDescription
                    }
                  >
                    This will replace the current
                    default template for{" "}
                    {getBillTypeName(
                      selectedTemplateType
                    )}
                    .
                  </small>
                </span>

              </label>

            </div>

            <div
              style={
                styles.modalActions
              }
            >

              <button
                type="button"
                onClick={closeTemplateModal}
                disabled={uploading}
                style={
                  styles.cancelButton
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleTemplateUpload
                }
                disabled={
                  uploading ||
                  !selectedTemplateFile
                }
                style={{
                  ...styles.uploadModalButton,

                  ...(
                    uploading ||
                    !selectedTemplateFile
                      ? styles.disabledButton
                      : {}
                  ),
                }}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Template"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================
          ASSIGN EXISTING TEMPLATE MODAL
      ===================================== */}

      {templateToAssign && (

        <div
          style={styles.modalOverlay}
          onClick={
            closeAssignTemplate
          }
        >

          <div
            style={styles.templateModal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div style={styles.modalHeader}>

              <div>
                <h3 style={styles.modalTitle}>
                  ⚙️ Template Settings
                </h3>

                <p style={styles.modalFileName}>
                  {templateToAssign.file_name}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeAssignTemplate
                }
                disabled={uploading}
                style={
                  styles.closeButton
                }
              >
                ✕
              </button>

            </div>

            <div
              style={
                styles.templateModalBody
              }
            >

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  Template For
                </label>

                <select
                  value={
                    assignTemplateType
                  }
                  onChange={(event) =>
                    setAssignTemplateType(
                      event.target.value
                    )
                  }
                  disabled={uploading}
                  style={styles.select}
                >

                  {BILL_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              <label
                style={
                  styles.defaultCheckboxRow
                }
              >

                <input
                  type="checkbox"
                  checked={
                    assignAsDefault
                  }
                  onChange={(event) =>
                    setAssignAsDefault(
                      event.target.checked
                    )
                  }
                  disabled={uploading}
                  style={
                    styles.checkbox
                  }
                />

                <span>
                  <strong>
                    Make this the default template
                  </strong>

                  <small
                    style={
                      styles.checkboxDescription
                    }
                  >
                    The current default for{" "}
                    {getBillTypeName(
                      assignTemplateType
                    )}{" "}
                    will be replaced.
                  </small>
                </span>

              </label>

            </div>

            <div
              style={
                styles.modalActions
              }
            >

              <button
                type="button"
                onClick={
                  closeAssignTemplate
                }
                disabled={uploading}
                style={
                  styles.cancelButton
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleAssignTemplate
                }
                disabled={uploading}
                style={
                  styles.uploadModalButton
                }
              >
                {uploading
                  ? "Saving..."
                  : "Save Settings"}
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}


// =====================================
// FILE ROW
// =====================================

function FileRow({
  file,
  onView,
  onDownload,
  onRename,
  onDelete,
  onSetDefault,
  onAssignTemplate,
  formatFileSize,
  getBillTypeName,
  disabled,
}) {
  const isSignature =
    file.file_type === "signature";

  const isTemplate =
    file.file_type === "template";

  const hasTemplateType =
    Boolean(
      file.template_bill_type
    );

  return (
    <div
      style={{
        ...styles.fileRow,

        ...(isTemplate &&
        file.is_default
          ? styles.defaultFileRow
          : {}),
      }}
    >

      {/* FILE INFORMATION */}

      <div style={styles.fileInfo}>

        <div style={styles.fileIcon}>
          {isSignature
            ? "🖼"
            : "📄"}
        </div>

        <div
          style={
            styles.fileMainInfo
          }
        >

          <div style={styles.fileName}>
            {file.file_name}
          </div>

          {/* TEMPLATE TYPE */}

          {isTemplate && (
            <div
              style={
                styles.templateMetaRow
              }
            >

              {hasTemplateType ? (
                <span
                  style={
                    styles.typeBadge
                  }
                >
                  {getBillTypeName(
                    file.template_bill_type
                  )}
                </span>
              ) : (
                <span
                  style={
                    styles.unassignedBadge
                  }
                >
                  ⚠ Type not assigned
                </span>
              )}

              {file.is_default &&
                hasTemplateType && (
                  <span
                    style={
                      styles.defaultBadge
                    }
                  >
                    ⭐ Default
                  </span>
                )}

            </div>
          )}

          {/* META */}

          <div style={styles.fileMeta}>

            {formatFileSize(
              file.file_size
            )}

            {" • "}

            {new Date(
              file.created_at
            ).toLocaleDateString(
              "en-IN"
            )}

          </div>

        </div>

      </div>

      {/* ACTIONS */}

      <div style={styles.actions}>

        {/* SIGNATURE VIEW */}

        {isSignature && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onView(file)
            }
            style={
              styles.viewButton
            }
          >
            👁 View
          </button>
        )}

        {/* TEMPLATE INFO */}

        {isTemplate && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onView(file)
            }
            style={
              styles.viewButton
            }
          >
            ℹ Info
          </button>
        )}

        {/* DOWNLOAD */}

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onDownload(file)
          }
          style={
            styles.downloadButton
          }
        >
          ⬇ Download
        </button>

        {/* ASSIGN / CHANGE TYPE */}

        {isTemplate && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onAssignTemplate(file)
            }
            style={
              styles.settingsButton
            }
          >
            ⚙ Settings
          </button>
        )}

        {/* SET DEFAULT */}

        {isTemplate &&
          hasTemplateType &&
          !file.is_default && (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onSetDefault(file)
              }
              style={
                styles.defaultButton
              }
            >
              ⭐ Set Default
            </button>
          )}

        {/* ASSIGN TYPE */}

        {isTemplate &&
          !hasTemplateType && (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAssignTemplate(file)
              }
              style={
                styles.assignButton
              }
            >
              ⚠ Assign Type
            </button>
          )}

        {/* RENAME */}

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onRename(file)
          }
          style={
            styles.renameButton
          }
        >
          ✏ Rename
        </button>

        {/* DELETE */}

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onDelete(file)
          }
          style={
            styles.deleteButton
          }
        >
          🗑 Delete
        </button>

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
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    color: "#1f2937",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    lineHeight: "1.5",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  signatureButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "9px",
    background: "#16a34a",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  templateButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  message: {
    padding: "14px 18px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  infoMessage: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  },

  errorMessage: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
  },

  uploadingBox: {
    padding: "15px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    color: "#1d4ed8",
    marginBottom: "20px",
  },

  section: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.04)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1f2937",
  },

  sectionDescription: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  countBadge: {
    minWidth: "32px",
    height: "32px",
    padding: "0 8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "50%",
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: "700",
  },

  // =====================================
  // DEFAULT CARDS
  // =====================================

  defaultGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },

  defaultCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    background: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: "10px",
  },

  defaultCardEmpty: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    background: "#fafafa",
    border: "1px dashed #d1d5db",
    borderRadius: "10px",
  },

  defaultCardIcon: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    fontSize: "20px",
  },

  defaultCardContent: {
    minWidth: 0,
    flex: 1,
  },

  defaultCardTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1f2937",
  },

  defaultCardFile: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  notConfigured: {
    marginTop: "5px",
    color: "#9ca3af",
    fontSize: "12px",
  },

  // =====================================
  // FILE LIST
  // =====================================

  fileList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  fileRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    flexWrap: "wrap",
    background: "white",
  },

  defaultFileRow: {
    border:
      "1px solid #bfdbfe",
    background: "#f8fbff",
  },

  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: "250px",
    flex: 1,
  },

  fileMainInfo: {
    minWidth: 0,
  },

  fileIcon: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
    borderRadius: "9px",
    fontSize: "20px",
  },

  fileName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#374151",
    wordBreak: "break-word",
  },

  templateMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "6px",
  },

  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    background: "#eef2ff",
    border:
      "1px solid #c7d2fe",
    color: "#4338ca",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },

  unassignedBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    background: "#fff7ed",
    border:
      "1px solid #fed7aa",
    color: "#c2410c",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },

  defaultBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    background: "#ecfdf5",
    border:
      "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },

  fileMeta: {
    marginTop: "5px",
    fontSize: "12px",
    color: "#9ca3af",
  },

  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
  },

  // =====================================
  // BUTTONS
  // =====================================

  viewButton: {
    padding: "8px 13px",
    border:
      "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  downloadButton: {
    padding: "8px 13px",
    border:
      "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#15803d",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  settingsButton: {
    padding: "8px 13px",
    border:
      "1px solid #ddd6fe",
    background: "#f5f3ff",
    color: "#6d28d9",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  defaultButton: {
    padding: "8px 13px",
    border:
      "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  assignButton: {
    padding: "8px 13px",
    border:
      "1px solid #fed7aa",
    background: "#fff7ed",
    color: "#c2410c",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  renameButton: {
    padding: "8px 13px",
    border:
      "1px solid #fde68a",
    background: "#fffbeb",
    color: "#d97706",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  deleteButton: {
    padding: "8px 13px",
    border:
      "1px solid #fecaca",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  emptyUploadButton: {
    marginTop: "15px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  },

  empty: {
    minHeight: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "36px",
    marginBottom: "10px",
  },

  // =====================================
  // MODALS
  // =====================================

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "rgba(0, 0, 0, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 9999,
  },

  modal: {
    width: "100%",
    maxWidth: "800px",
    maxHeight: "90vh",
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.3)",
  },

  templateModal: {
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.3)",
  },

  modalHeader: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    borderBottom:
      "1px solid #e5e7eb",
  },

  modalTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1f2937",
  },

  modalFileName: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  closeButton: {
    width: "36px",
    height: "36px",
    flexShrink: 0,
    border: "none",
    background: "#f3f4f6",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "18px",
  },

  templateModalBody: {
    padding: "22px",
    overflowY: "auto",
  },

  formGroup: {
    marginBottom: "20px",
  },

  formLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: "700",
  },

  chooseFileButton: {
    width: "100%",
    padding: "12px 15px",
    border:
      "1px dashed #93c5fd",
    background: "#eff6ff",
    color: "#2563eb",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    textAlign: "left",
  },

  selectedFileBox: {
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "#f8fafc",
    border:
      "1px solid #e5e7eb",
    borderRadius: "9px",
  },

  selectedFileIcon: {
    width: "38px",
    height: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eff6ff",
    borderRadius: "8px",
    fontSize: "18px",
  },

  selectedFileInfo: {
    flex: 1,
    minWidth: 0,
  },

  selectedFileName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  selectedFileSize: {
    marginTop: "3px",
    color: "#9ca3af",
    fontSize: "11px",
  },

  removeFileButton: {
    width: "30px",
    height: "30px",
    border: "none",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: "7px",
    cursor: "pointer",
  },

  select: {
    width: "100%",
    padding: "11px 12px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    background: "white",
    color: "#374151",
    fontSize: "14px",
    outline: "none",
  },

  formHint: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "12px",
  },

  defaultCheckboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "14px",
    background: "#f8fafc",
    border:
      "1px solid #e5e7eb",
    borderRadius: "9px",
    cursor: "pointer",
  },

  checkbox: {
    width: "17px",
    height: "17px",
    marginTop: "1px",
    cursor: "pointer",
  },

  checkboxDescription: {
    display: "block",
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "11px",
    fontWeight: "400",
    lineHeight: "1.4",
  },

  modalActions: {
    padding: "15px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    borderTop:
      "1px solid #e5e7eb",
  },

  cancelButton: {
    padding: "10px 18px",
    border:
      "1px solid #d1d5db",
    background: "white",
    color: "#374151",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  uploadModalButton: {
    padding: "10px 18px",
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  // =====================================
  // SIGNATURE PREVIEW
  // =====================================

  imagePreviewContainer: {
    flex: 1,
    minHeight: "300px",
    maxHeight: "60vh",
    padding: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "auto",
    background: "#f8fafc",
  },

  previewImage: {
    maxWidth: "100%",
    maxHeight: "55vh",
    objectFit: "contain",
    background: "white",
  },

  closeModalButton: {
    padding: "9px 18px",
    border: "none",
    background: "#374151",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default UploadFiles;