import React, { useEffect } from "react";
import "./Groups.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import GroupCard from "./GroupCard/GroupCard";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";

const Groups = () => {
  const dispatch = useDispatch();
  const { groups, loading, error } = useSelector((state) => state.group);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  return (
    <div className="groups">
      <div className="groups__header">
        <div className="title">Your Groups</div>
        <div className="add_group">
          <button>
            {" "}
            <FontAwesomeIcon icon={faPlus} color="white" /> Add new
          </button>
        </div>
      </div>
      <div className="groups__cards">
        {groups && groups.length > 0 ? (
          groups.map((group) => <GroupCard key={group._id} group={group} />)
        ) : (
          <div className="empty_message">No groups found ☹️, Please Create one</div>
        )}
      </div>
    </div>
  );
};

export default Groups;
