import { useMemo, useState } from "react";
import "./GroupSelector.scss";
import { FaUsers, FaSearch, FaTimes } from "react-icons/fa";

const CATEGORY_EMOJI = {
  Household: "🏠",
  Travel: "✈️",
  Entertainment: "🎬",
  Groceries: "🛒",
  Dining: "🍽️",
  Gifts: "🎁",
  Utilities: "💡",
  Social: "🎉",
  Bill: "🧾",
  Subscriptions: "📺",
  Education: "📚",
  Health: "💊",
  Others: "✨",
};

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const GroupSelector = ({
  groups = [],
  selectedId,
  onSelect,
  label = "Choose group",
}) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, query]);

  if (groups.length === 0) {
    return (
      <div className="groupSelector groupSelector--empty">
        <FaUsers />
        <span>No groups yet — create one to get started.</span>
      </div>
    );
  }

  return (
    <div className="groupSelector">
      <div className="groupSelector__head">
        <span className="groupSelector__label">{label}</span>
        {groups.length > 6 && (
          <div className="groupSelector__search">
            <FaSearch />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups…"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="groupSelector__rail">
        {filtered.map((group) => {
          const isActive = group._id === selectedId;
          const emoji = CATEGORY_EMOJI[group.category] || "✨";
          return (
            <button
              type="button"
              key={group._id}
              className={`groupSelector__chip ${
                isActive ? "groupSelector__chip--active" : ""
              }`}
              onClick={() => onSelect(group._id)}
              aria-pressed={isActive}
            >
              <span className="groupSelector__avatar">
                {group.image ? (
                  <img src={group.image} alt="" />
                ) : (
                  <span>{initials(group.name)}</span>
                )}
              </span>
              <span className="groupSelector__meta">
                <span className="groupSelector__name">{group.name}</span>
                <span className="groupSelector__sub">
                  <span className="groupSelector__emoji">{emoji}</span>
                  {group.members?.length || 0}{" "}
                  {group.members?.length === 1 ? "member" : "members"}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="groupSelector__noresults">
            No groups match “{query}”
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSelector;
