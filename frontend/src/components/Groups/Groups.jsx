import { useEffect, useState } from "react";
import "./Groups.scss";
import {
  FaPlus,
  FaArrowRight,
  FaUsers,
  FaExclamationCircle,
} from "react-icons/fa";
import GroupCard from "./GroupCard/GroupCard";
import GroupInsights from "./GroupInsights/GroupInsights";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import Fab from "../shared/Fab/Fab";

const SkeletonCard = () => (
  <div className="groupsPage__skeleton" aria-hidden="true">
    <div className="groupsPage__skeleton-cover" />
    <div className="groupsPage__skeleton-body">
      <div className="groupsPage__skeleton-line" />
      <div className="groupsPage__skeleton-line groupsPage__skeleton-line--short" />
      <div className="groupsPage__skeleton-line groupsPage__skeleton-line--row" />
    </div>
  </div>
);

const Groups = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { groups, loading, error } = useSelector((state) => state.group);
  // Track only the OPEN group's id and re-derive the live group from the
  // store on every render. Storing the group object itself froze a
  // snapshot, so member adds/removes (which update the store) never
  // showed up in the open Insights/Edit modal.
  const [insightsGroupId, setInsightsGroupId] = useState(null);
  const insightsGroup =
    insightsGroupId != null
      ? groups.find((g) => g._id === insightsGroupId) || null
      : null;

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleAdd = () => onNavigate?.("AddGroup");

  const hasGroups = groups && groups.length > 0;

  return (
    <div className="groupsPage">
      <div className="groupsPage__bg" aria-hidden="true">
        <div className="groupsPage__grid" />
      </div>

      <header className="groupsPage__topbar">
        <div className="groupsPage__crumbs">
          <span>Dashboard</span>
          <FaArrowRight />
          <span className="active">Groups</span>
        </div>

        <div className="groupsPage__heading">
          <div>
            <h1 className="groupsPage__title">Your groups</h1>
            <p className="groupsPage__subtitle">
              {hasGroups
                ? `You${"’"}re part of ${groups.length} ${
                    groups.length === 1 ? "group" : "groups"
                  }.`
                : "Create your first group to start splitting expenses."}
            </p>
          </div>

          <button
            type="button"
            className="groupsPage__add"
            onClick={handleAdd}
          >
            <FaPlus /> <span>New group</span>
          </button>
        </div>
      </header>

      <section className="groupsPage__content">
        {loading && !hasGroups ? (
          <div className="groupsPage__grid-cards">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="groupsPage__state groupsPage__state--error">
            <FaExclamationCircle />
            <h3>Couldn&apos;t load your groups</h3>
            <p>
              {(typeof error === "string" ? error : error?.message) ||
                "Please try again in a moment."}
            </p>
            <button
              type="button"
              className="groupsPage__retry"
              onClick={() => dispatch(fetchGroups())}
            >
              Retry
            </button>
          </div>
        ) : hasGroups ? (
          <div className="groupsPage__grid-cards">
            {groups.map((group) => (
              <GroupCard
                key={group._id}
                group={group}
                onOpen={(g) => setInsightsGroupId(g._id)}
              />
            ))}
          </div>
        ) : (
          <div className="groupsPage__state">
            <div className="groupsPage__state-icon">
              <FaUsers />
            </div>
            <h3>No groups yet</h3>
            <p>
              Groups help you keep shared expenses organized.
              Start by creating one.
            </p>
            <button
              type="button"
              className="groupsPage__add"
              onClick={handleAdd}
            >
              <FaPlus /> <span>Create your first group</span>
            </button>
          </div>
        )}
      </section>

      <Fab onClick={handleAdd} label="New group" />

      <GroupInsights
        group={insightsGroup}
        open={!!insightsGroup}
        onClose={() => setInsightsGroupId(null)}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default Groups;
