export default function ReportsTabs({
  activeTab,
  onChange,
}) {
  const tabs = [
    ["overview", "Overview"],
    ["bills", "Bills"],
    ["payments", "Received Payment"],
    ["hisab", "Hisab Summary"],
  ];

  return (
    <nav
      className="reports-tabs"
      aria-label="Report sections"
    >
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={`reports-tab ${
            activeTab === value
              ? "active"
              : ""
          }`}
          onClick={() =>
            onChange(value)
          }
        >
          {label}
        </button>
      ))}
    </nav>
  );
}