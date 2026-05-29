import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import "./GroupInsights.scss";
import { fetchGroupStats } from "../../../store/statsSlice";
import { getAllExpenses } from "../../../store/expenseSlice";
import { deleteGroup } from "../../../store/groupSlice";
import { useCurrentGroup } from "../../../hooks/useCurrentGroup";
import { CATEGORY_EMOJI } from "../../../utils/categoryInfer";
import EditGroupModal from "../EditGroupModal/EditGroupModal";
import {
  FaTimes,
  FaArrowRight,
  FaCoins,
  FaUsers,
  FaListUl,
  FaHandshake,
  FaImage,
  FaChartPie,
  FaCheckCircle,
  FaPen,
  FaTrash,
  FaExclamationTriangle,
  FaChevronDown,
} from "react-icons/fa";

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const GroupInsights = ({ group, open, onClose, onNavigate }) => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((state) => state.stats);
  const { expenses } = useSelector((state) => state.expense);
  const [currentGroupId, setCurrentGroup] = useCurrentGroup();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Collapsible sections — settlements open by default (it's the action
  // item), balances collapsed (secondary info, can grow long).
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [settlesOpen, setSettlesOpen] = useState(true);

  useEffect(() => {
    if (open && group?._id) {
      dispatch(fetchGroupStats(group._id));
      dispatch(getAllExpenses(group._id));
    }
  }, [open, group?._id, dispatch]);

  const isForCurrentGroup = stats?.groupId === group?._id;
  const data = isForCurrentGroup ? stats : null;

  const totalSpent = Number(data?.totalSpent || 0);
  const expenseCount =
    data?.expenseCount ?? data?.totalExpenses ?? (expenses?.length || 0);
  const memberCount = group?.members?.length || 0;

  // Prefer the direct/intuitive view (matches what each pair actually owes
  // from real expenses). Fall back to the simplified set if direct is
  // missing (older API response).
  const settlements = useMemo(() => {
    const list = data?.directSettlements?.length
      ? data.directSettlements
      : data?.settlements || [];
    return list.filter((s) => Number(s.amount) > 0);
  }, [data]);

  const totalOutstanding = useMemo(
    () => settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [settlements]
  );

  const balanceRows = useMemo(() => {
    if (!data?.memberStats) return [];
    return Object.values(data.memberStats)
      .map((m) => ({
        id: m._id,
        name: m.name,
        net: Number(
          m.netBalance ??
            Number(m.totalPaid || 0) - Number(m.totalShare || 0)
        ),
      }))
      .sort((a, b) => b.net - a.net);
  }, [data]);

  const topCategory = useMemo(() => {
    if (!data?.categoryWiseSpendings) return null;
    const entries = Object.entries(data.categoryWiseSpendings).sort(
      ([, a], [, b]) => Number(b) - Number(a)
    );
    return entries[0]?.[0] || null;
  }, [data]);

  const handleOpenIn = (key) => {
    if (group?._id) setCurrentGroup(group._id);
    onNavigate?.(key);
    onClose?.();
  };

  const handleDelete = async () => {
    if (!group?._id) return;
    setDeleting(true);
    const result = await dispatch(deleteGroup(group._id));
    setDeleting(false);

    if (result.type.endsWith("/fulfilled")) {
      const deletedCount = result.payload?.deletedExpenses || 0;
      toast.success(
        deletedCount > 0
          ? `Group deleted (${deletedCount} expense${
              deletedCount === 1 ? "" : "s"
            } removed).`
          : "Group deleted."
      );
      // If this was the active group, clear it.
      if (currentGroupId === group._id) setCurrentGroup("");
      setConfirmDelete(false);
      onClose?.();
    } else {
      toast.error(result.payload?.message || "Failed to delete group.");
    }
  };

  if (!open || !group) return null;

  const emoji = CATEGORY_EMOJI[group.category] || "✨";

  return (
    <div
      className="groupIns-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="groupIns">
        <div className="groupIns__cover">
          {group.image ? (
            <img src={group.image} alt="" />
          ) : (
            <div className="groupIns__cover-fallback">
              <FaImage />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="groupIns__close"
          >
            <FaTimes />
          </button>
          <div className="groupIns__title-wrap">
            <span className="groupIns__cat">
              {emoji} {group.category || "Group"}
            </span>
            <h2 className="groupIns__title">{group.name}</h2>
            {group.description && (
              <p className="groupIns__desc">{group.description}</p>
            )}
          </div>
        </div>

        <div className="groupIns__body">
          {loading && !isForCurrentGroup ? (
            <div className="groupIns__loading">
              <div className="groupIns__spinner" />
              <span>Loading insights…</span>
            </div>
          ) : (
            <>
              <div className="groupIns__kpis">
                <div className="groupIns__kpi">
                  <span className="groupIns__kpi-icon groupIns__kpi-icon--brand">
                    <FaCoins />
                  </span>
                  <div>
                    <small>Total spent</small>
                    <strong>₹{formatMoney(totalSpent)}</strong>
                  </div>
                </div>

                <div className="groupIns__kpi">
                  <span className="groupIns__kpi-icon groupIns__kpi-icon--green">
                    <FaUsers />
                  </span>
                  <div>
                    <small>Members</small>
                    <strong>{memberCount}</strong>
                  </div>
                </div>

                <div className="groupIns__kpi">
                  <span className="groupIns__kpi-icon groupIns__kpi-icon--blue">
                    <FaListUl />
                  </span>
                  <div>
                    <small>Expenses</small>
                    <strong>{expenseCount}</strong>
                  </div>
                </div>

                <div className="groupIns__kpi">
                  <span className="groupIns__kpi-icon groupIns__kpi-icon--red">
                    <FaHandshake />
                  </span>
                  <div>
                    <small>Outstanding</small>
                    <strong>₹{formatMoney(totalOutstanding)}</strong>
                  </div>
                </div>

                {topCategory && (
                  <div className="groupIns__kpi groupIns__kpi--wide">
                    <span className="groupIns__kpi-icon groupIns__kpi-icon--orange">
                      <FaChartPie />
                    </span>
                    <div>
                      <small>Top category</small>
                      <strong>
                        {CATEGORY_EMOJI[topCategory] || ""} {topCategory}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Balances (collapsible) */}
              {balanceRows.length > 0 && (
                <div
                  className={`groupIns__section ${
                    balancesOpen ? "groupIns__section--open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="groupIns__section-head"
                    onClick={() => setBalancesOpen((v) => !v)}
                    aria-expanded={balancesOpen}
                  >
                    <h3>Net balances</h3>
                    <span className="groupIns__section-count">
                      {balanceRows.length}
                    </span>
                    <FaChevronDown className="groupIns__section-chev" />
                  </button>
                  {balancesOpen && (
                    <ul className="groupIns__balances">
                      {balanceRows.map((row) => {
                        const isOwed = row.net > 0.005;
                        const owes = row.net < -0.005;
                        return (
                          <li key={row.id}>
                            <span className="groupIns__avatar">
                              {initials(row.name)}
                            </span>
                            <span className="groupIns__bal-name">
                              {row.name}
                            </span>
                            {isOwed ? (
                              <span className="groupIns__bal-amt groupIns__bal-amt--pos">
                                +₹{formatMoney(row.net)}
                              </span>
                            ) : owes ? (
                              <span className="groupIns__bal-amt groupIns__bal-amt--neg">
                                −₹{formatMoney(Math.abs(row.net))}
                              </span>
                            ) : (
                              <span className="groupIns__bal-amt groupIns__bal-amt--zero">
                                settled
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Settlements preview (collapsible) */}
              {settlements.length > 0 ? (
                <div
                  className={`groupIns__section ${
                    settlesOpen ? "groupIns__section--open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="groupIns__section-head"
                    onClick={() => setSettlesOpen((v) => !v)}
                    aria-expanded={settlesOpen}
                  >
                    <h3>Pending settlements</h3>
                    <span className="groupIns__section-count">
                      {settlements.length}
                    </span>
                    <FaChevronDown className="groupIns__section-chev" />
                  </button>
                  {settlesOpen && (
                    <>
                      <ul className="groupIns__settles">
                        {settlements.slice(0, 5).map((s, i) => (
                          <li key={i}>
                            <span className="groupIns__avatar">
                              {initials(s.fromName)}
                            </span>
                            <FaArrowRight />
                            <span className="groupIns__avatar groupIns__avatar--alt">
                              {initials(s.toName)}
                            </span>
                            <span className="groupIns__settle-text">
                              <strong>{s.fromName}</strong> → {s.toName}
                            </span>
                            <strong className="groupIns__settle-amt">
                              ₹{formatMoney(s.amount)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      {settlements.length > 5 && (
                        <p className="groupIns__more">
                          +{settlements.length - 5} more in the full report.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                expenseCount > 0 && (
                  <div className="groupIns__settled">
                    <FaCheckCircle /> Everyone is even.
                  </div>
                )
              )}

              {/* Manage row */}
              <div className="groupIns__manage">
                <button
                  type="button"
                  className="groupIns__manage-btn"
                  onClick={() => setEditOpen(true)}
                >
                  <FaPen /> Edit details &amp; members
                </button>
                <button
                  type="button"
                  className="groupIns__manage-btn groupIns__manage-btn--danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  <FaTrash /> Delete group
                </button>
              </div>

              {/* Actions */}
              <div className="groupIns__actions">
                <button
                  type="button"
                  className="groupIns__btn groupIns__btn--ghost"
                  onClick={() => handleOpenIn("ExpenseList")}
                >
                  View expenses
                </button>
                <button
                  type="button"
                  className="groupIns__btn groupIns__btn--primary"
                  onClick={() => handleOpenIn("ViewSplits")}
                >
                  Open full report
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <EditGroupModal
        open={editOpen}
        group={group}
        onClose={() => setEditOpen(false)}
      />

      {confirmDelete && (
        <div
          className="groupIns-confirm-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="groupIns-confirm">
            <div className="groupIns-confirm__icon">
              <FaExclamationTriangle />
            </div>
            <h3>Delete this group?</h3>
            <p>
              This permanently removes <strong>{group.name}</strong> and{" "}
              <strong>
                {expenseCount}{" "}
                {expenseCount === 1 ? "expense" : "expenses"}
              </strong>{" "}
              from it. This can&apos;t be undone.
            </p>
            <div className="groupIns-confirm__actions">
              <button
                type="button"
                className="groupIns__btn groupIns__btn--ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="groupIns__btn groupIns__btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInsights;
