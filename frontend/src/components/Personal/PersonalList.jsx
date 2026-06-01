import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./Personal.scss";
import { getCurrencySymbol, formatMoney } from "../../utils/currency";
import { CATEGORY_EMOJI } from "../../utils/categoryInfer";
import { deletePersonal, getPersonal } from "../../store/personalSlice";
import AddPersonalExpense from "./AddPersonalExpense";
import {
  FaPlus,
  FaPen,
  FaTrash,
  FaUser,
  FaUsers,
  FaWallet,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const SOURCES = [
  { key: "all", label: "All" },
  { key: "personal", label: "Personal" },
  { key: "group", label: "Group" },
];

// The personal feed: solo expenses (editable) + group expenses the user
// paid (read-only, tagged with the group). Search + source filter so you
// can isolate solo spends from group ones. Add/edit via the modal.
const PersonalList = () => {
  const dispatch = useDispatch();
  const { expenses, loading } = useSelector((s) => s.personal);
  const { userInfo } = useSelector((s) => s.login);
  const symbol = getCurrencySymbol(userInfo?.currency);
  const [modal, setModal] = useState({ open: false, expense: null });
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all"); // all | personal | group

  const filtered = useMemo(() => {
    let list = expenses;
    if (source !== "all") {
      list = list.filter((e) => e.sourceType === source);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.groupName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, source, search]);

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filtered]
  );

  const del = (id) =>
    dispatch(deletePersonal(id)).then((a) => {
      if (a.meta.requestStatus === "fulfilled") {
        setConfirmId(null);
        dispatch(getPersonal());
      }
    });

  const hasAny = expenses.length > 0;

  return (
    <div className="pList">
      <div className="pList__head">
        <span className="pList__head-title">Recent</span>
        <button
          type="button"
          className="pList__add"
          onClick={() => setModal({ open: true, expense: null })}
        >
          <FaPlus /> Add
        </button>
      </div>

      {hasAny && (
        <>
          <div className="pList__filters">
            <div className="pList__search">
              <FaSearch />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, category, group…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <div className="pList__src-tabs" role="tablist" aria-label="Source">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={source === s.key}
                  className={`pList__src-tab ${
                    source === s.key ? "pList__src-tab--active" : ""
                  }`}
                  onClick={() => setSource(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pList__summary">
            <span>
              {filtered.length} of {expenses.length}
            </span>
            <strong>
              {symbol}
              {formatMoney(total)}
            </strong>
          </div>
        </>
      )}

      {loading && expenses.length === 0 ? (
        <div className="pList__skel">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="pList__skel-row" key={i} />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="pList__empty">
          <div className="pList__empty-icon">
            <FaWallet />
          </div>
          <h3>Nothing logged yet</h3>
          <p>
            Add your first personal expense, or pay for something in a group
            and it&apos;ll show up here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pList__empty">
          <div className="pList__empty-icon">
            <FaSearch />
          </div>
          <h3>No matches</h3>
          <p>Try a different search or switch the filter.</p>
        </div>
      ) : (
        <ul className="pList__items">
          {filtered.map((e) => (
            <li className="pList__item" key={`${e.sourceType}-${e._id}`}>
              <span className="pList__emoji">
                {CATEGORY_EMOJI[e.category] || "✨"}
              </span>
              <div className="pList__meta">
                <strong>{e.description}</strong>
                <small>
                  {fmtDate(e.date)} ·{" "}
                  {e.sourceType === "personal" ? (
                    <span className="pList__src">
                      <FaUser /> Personal
                    </span>
                  ) : (
                    <span className="pList__src">
                      <FaUsers /> {e.groupName}
                    </span>
                  )}
                </small>
              </div>
              <span className="pList__amt">
                {symbol}
                {formatMoney(e.amount)}
              </span>
              {e.editable ? (
                confirmId === e._id ? (
                  <div className="pList__confirm">
                    <button type="button" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pList__confirm-yes"
                      onClick={() => del(e._id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="pList__actions">
                    <button
                      type="button"
                      onClick={() => setModal({ open: true, expense: e })}
                      aria-label="Edit"
                    >
                      <FaPen />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(e._id)}
                      aria-label="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )
              ) : (
                <span className="pList__badge" title="Paid by you in a group">
                  Group
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddPersonalExpense
        open={modal.open}
        expense={modal.expense}
        symbol={symbol}
        onClose={() => setModal({ open: false, expense: null })}
      />
    </div>
  );
};

export default PersonalList;
