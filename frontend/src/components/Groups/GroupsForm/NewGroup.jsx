import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./NewGroup.scss";
import group from "../../../assets/group.png";
import { createGroup, resetGroupState } from "../../../store/groupSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const NewGroup = () => {
  const [groupName, setGroupName] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [members, setMembers] = useState([""]);

  const categories = [
    "Household",
    "Travel",
    "Entertainment",
    "Groceries",
    "Dining",
    "Gifts",
    "Utilities",
    "Social",
    "Bill",
    "Subscriptions",
    "Education",
    "Health",
    "Others",
  ];

  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.group);

  const handleAddMember = () => {
    setMembers([...members, ""]);
  };

  const handleRemoveMember = (index) => {
    const updatedMembers = members.filter((_, idx) => idx !== index);
    setMembers(updatedMembers);
  };

  const handleMemberChange = (index, value) => {
    const updatedMembers = members.map((member, idx) =>
      idx === index ? value : member
    );
    setMembers(updatedMembers);
  };

  const handleImageUpload = (e) => {
    setGroupImage(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", groupName);
    formData.append("description", purpose);
    formData.append("category", category);
    formData.append("image", groupImage);
    members.forEach((member) => formData.append("members", member));
    dispatch(createGroup(formData));
    setGroupName("");
    setPurpose("");
    setCategory("");
    setGroupImage(null);
    setMembers([""]);
  };

  useEffect(() => {
    if (success) {
      toast.success("Group has been created successfully!");
      dispatch(resetGroupState());
    }

    if (error) {
      toast.error("Failed to create the group.");
      dispatch(resetGroupState());
    }
  }, [success, error]);

  return (
    <div className="newGroup">
      <div className="newGroup__header">
        <div className="title">Add Group</div>
      </div>
      <div className="form__container">
        <form onSubmit={handleSubmit} className="newGroup__form">
          <h2 className="title">Create a Group</h2>
          <div className="formInput">
            <label>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>
          <div className="formInput">
            <label>Purpose of Group</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
          </div>

          <div className="formInput">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="uploadInput">
            <label htmlFor="file-upload" className="custom-file-upload">
              Upload group photo
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <label>selected File : {groupImage?.name} </label>
          </div>
          <div className="membersInput">
            <label>Add Members</label>
            {members.map((member, index) => (
              <div key={index}>
                <input
                  type="text"
                  placeholder={`Member ${index + 1}`}
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  required
                />
                {index > 0 && (
                  <button
                    type="button"
                    className="remove"
                    onClick={() => handleRemoveMember(index)}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="addMember"
              onClick={handleAddMember}
            >
              Add Another Member
            </button>
          </div>
          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Creating Group..." : "Create Group"}
          </button>
        </form>
        <div className="image">
          <img src={group} alt="" />
        </div>
      </div>
    </div>
  );
};

export default NewGroup;
