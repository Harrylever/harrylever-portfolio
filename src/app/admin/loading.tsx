export default function AdminLoading() {
  return (
    <div aria-busy="true" className="adm-main" role="status">
      <p className="adm-lede" style={{ marginTop: 0 }}>
        Loading admin…
      </p>
      <div aria-hidden="true" className="adm-placeholder">
        <div className="adm-bar" style={{ width: "40%", height: 28 }} />
        <div className="adm-bar" style={{ width: "85%" }} />
        <div className="adm-bar" style={{ width: "70%" }} />
        <div className="adm-bar" style={{ width: "78%" }} />
      </div>
    </div>
  );
}
