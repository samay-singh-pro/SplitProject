import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./NewGroup.scss";
import { createGroup, resetGroupState } from "../../../store/groupSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaUsers,
  FaTag,
  FaImage,
  FaPlus,
  FaTimes,
  FaCheck,
  FaArrowRight,
  FaPenFancy,
  FaUser,
  FaCloudUploadAlt,
  FaTrashAlt,
  FaExclamationCircle,
  FaMagic,
  FaChevronDown,
} from "react-icons/fa";
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../../utils/categoryInfer";

const MAX_IMAGE_MB = 5;

const initials = (value) => {
  if (!value) return "?";
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const NewGroup = () => {
  const [groupName, setGroupName] = useState("");
  const [category, setCategory] = useState("Others");
  const [categoryAuto, setCategoryAuto] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberInput, setMemberInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Re-infer category from name + purpose while user hasn't picked one
  // manually. Combine both fields so "Goa Trip 2026" + "vacation" → Travel.
  const reinferCategory = (name, purposeText) => {
    if (!categoryAuto) return;
    const guess = inferCategory(`${name} ${purposeText}`);
    setCategory(guess || "Others");
  };

  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.group);

  const selectedCategoryEmoji = CATEGORY_EMOJI[category] || null;

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAddMember = () => {
    const value = memberInput.trim();
    if (!value) return;
    if (members.some((m) => m.toLowerCase() === value.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        members: "That name has already been added.",
      }));
      return;
    }
    setMembers([...members, value]);
    setMemberInput("");
    clearError("members");
  };

  const handleMemberKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddMember();
    }
  };

  const handleRemoveMember = (index) => {
    setMembers(members.filter((_, idx) => idx !== index));
  };

  const setImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please choose an image file." }));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: `Image must be under ${MAX_IMAGE_MB}MB.`,
      }));
      return;
    }
    clearError("image");
    setGroupImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setImageFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    setGroupImage(null);
    setImagePreview(null);
    clearError("image");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setGroupName("");
    setPurpose("");
    setCategory("Others");
    setCategoryAuto(true);
    setShowCategoryPicker(false);
    clearImage();
    setMembers([]);
    setMemberInput("");
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (!groupName.trim()) next.name = "Give your group a name.";
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const formData = new FormData();
    formData.append("name", groupName.trim());
    formData.append("description", purpose.trim());
    formData.append("category", category);
    if (groupImage) formData.append("image", groupImage);
    members.forEach((member) => formData.append("members", member));
    dispatch(createGroup(formData));
  };

  useEffect(() => {
    if (success) {
      toast.success("Group created!");
      resetForm();
      dispatch(resetGroupState());
    }
    if (error) {
      if (error.errors && typeof error.errors === "object") {
        setErrors(error.errors);
        toast.error(error.message || "Please check the highlighted fields.");
      } else {
        toast.error(error.message || "Failed to create the group.");
      }
      dispatch(resetGroupState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, error]);

  const previewName = groupName || "Your group name";
  const previewPurpose =
    purpose || "Add a short description so members know the context.";

  return (
    <div className="newGroup">
      <div className="newGroup__bg" aria-hidden="true">
        <div className="newGroup__grid" />
      </div>

      <header className="newGroup__topbar">
        <div className="newGroup__crumbs">
          <span>Groups</span>
          <FaArrowRight />
          <span className="active">New</span>
        </div>
        <h1 className="newGroup__title">Create a new group</h1>
        <p className="newGroup__subtitle">
          Set up a space to track shared expenses with your people.
        </p>
      </header>

      <div className="newGroup__layout">
        <form
          onSubmit={handleSubmit}
          className="newGroup__card newGroup__form"
          noValidate
        >
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">1</span>
              <div>
                <h2>Group details</h2>
              </div>
            </div>

            <div
              className={`ng-field ${errors.name ? "ng-field--error" : ""}`}
            >
              <label htmlFor="ng-name">
                <FaPenFancy /> Group name
                <span className="ng-required">*</span>
              </label>
              <input
                id="ng-name"
                type="text"
                placeholder="e.g. Goa Trip 2026"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  reinferCategory(e.target.value, purpose);
                  if (errors.name) clearError("name");
                }}
                maxLength={50}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "ng-name-err" : "ng-name-hint"}
              />
              {errors.name ? (
                <span id="ng-name-err" className="ng-field__error">
                  <FaExclamationCircle />
                  {errors.name}
                </span>
              ) : (
                <span id="ng-name-hint" className="ng-field__hint">
                  {groupName.length}/50 characters
                </span>
              )}
            </div>

            <div className="ng-field">
              <label htmlFor="ng-purpose">
                <FaTag /> Purpose
                <span className="ng-optional">optional</span>
              </label>
              <input
                id="ng-purpose"
                type="text"
                placeholder="What is this group for?"
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  reinferCategory(groupName, e.target.value);
                }}
              />
            </div>

            <div className="newGroup__autocat">
              <label className="newGroup__autocat-label">
                <FaTag /> Category
              </label>
              <button
                type="button"
                className={`newGroup__autotag ${
                  showCategoryPicker ? "newGroup__autotag--open" : ""
                }`}
                onClick={() => setShowCategoryPicker((v) => !v)}
              >
                {categoryAuto && <FaMagic />}
                <span>{CATEGORY_EMOJI[category] || "✨"}</span>
                <strong>{category}</strong>
                {categoryAuto && <small>auto</small>}
                <FaChevronDown className="newGroup__autotag-chev" />
              </button>
              {showCategoryPicker && (
                <div className="ng-chips">
                  {ALL_CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`ng-chip ${
                        category === c ? "ng-chip--active" : ""
                      }`}
                      onClick={() => {
                        setCategory(c);
                        setCategoryAuto(false);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <span className="ng-chip__emoji">
                        {CATEGORY_EMOJI[c]}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">2</span>
              <div>
                <h2>Cover image</h2>
              </div>
            </div>

            <div
              className={`ng-upload ${isDragging ? "ng-upload--drag" : ""} ${
                imagePreview ? "ng-upload--has-image" : ""
              } ${errors.image ? "ng-upload--error" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Group cover preview" />
                  <button
                    type="button"
                    className="ng-upload__remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    aria-label="Remove image"
                  >
                    <FaTrashAlt />
                  </button>
                </>
              ) : (
                <div className="ng-upload__placeholder">
                  <div className="ng-upload__icon">
                    <FaCloudUploadAlt />
                  </div>
                  <p>
                    <strong>Click to upload</strong> or drag &amp; drop
                  </p>
                  <span>PNG or JPG, up to {MAX_IMAGE_MB}MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                hidden
              />
            </div>
            {errors.image && (
              <span className="ng-field__error ng-field__error--block">
                <FaExclamationCircle />
                {errors.image}
              </span>
            )}
          </section>

          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">3</span>
              <div>
                <h2>Members</h2>
              </div>
            </div>

            <div
              className={`ng-member-input ${
                errors.members ? "ng-member-input--error" : ""
              }`}
            >
              <FaUser />
              <input
                type="text"
                placeholder="Type a name and press Enter"
                value={memberInput}
                onChange={(e) => {
                  setMemberInput(e.target.value);
                  if (errors.members) clearError("members");
                }}
                onKeyDown={handleMemberKey}
                maxLength={40}
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="ng-member-input__add"
                disabled={!memberInput.trim()}
              >
                <FaPlus />
                <span>Add</span>
              </button>
            </div>
            {errors.members && (
              <span className="ng-field__error ng-field__error--block">
                <FaExclamationCircle />
                {errors.members}
              </span>
            )}

            {members.length > 0 ? (
              <ul className="ng-members">
                {members.map((member, index) => (
                  <li key={`${member}-${index}`} className="ng-member">
                    <span className="ng-member__avatar">
                      {initials(member)}
                    </span>
                    <span className="ng-member__name">{member}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      aria-label={`Remove ${member}`}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ng-members__empty">
                <FaUsers />
                <span>No members yet — that’s okay, you can add them later.</span>
              </div>
            )}
          </section>

          <div className="ng-actions">
            <button
              type="button"
              className="ng-btn ng-btn--ghost"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
            <button
              type="submit"
              className="ng-btn ng-btn--primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="ng-spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <FaCheck /> Create group
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="newGroup__card newGroup__preview" aria-label="Preview">
          <div className="ng-preview__label">Live preview</div>

          <div className="ng-preview__card">
            <div className="ng-preview__cover">
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <div className="ng-preview__cover-fallback">
                  <FaImage />
                </div>
              )}
              {category && (
                <span className="ng-preview__category">
                  <span>{selectedCategoryEmoji}</span>
                  {category}
                </span>
              )}
            </div>

            <div className="ng-preview__body">
              <h3 className={!groupName ? "is-placeholder" : ""}>
                {previewName}
              </h3>
              <p className={!purpose ? "is-placeholder" : ""}>
                {previewPurpose}
              </p>

              <div className="ng-preview__members">
                <div className="ng-preview__avatars">
                  {members.slice(0, 4).map((m, i) => (
                    <span key={`${m}-${i}`} className="ng-preview__avatar">
                      {initials(m)}
                    </span>
                  ))}
                  {members.length > 4 && (
                    <span className="ng-preview__avatar ng-preview__avatar--more">
                      +{members.length - 4}
                    </span>
                  )}
                  {members.length === 0 && (
                    <span className="ng-preview__avatar ng-preview__avatar--empty">
                      <FaUsers />
                    </span>
                  )}
                </div>
                <span className="ng-preview__count">
                  {members.length}{" "}
                  {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>

          <ul className="ng-tips">
            <li>
              <FaCheck /> Only the name and category are required to create a group.
            </li>
            <li>
              <FaCheck /> Add members as plain names now — invites can come later.
            </li>
            <li>
              <FaCheck /> Everything here can be edited after the group is created.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default NewGroup;
