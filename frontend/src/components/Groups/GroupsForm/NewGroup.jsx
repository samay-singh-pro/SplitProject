import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./NewGroup.scss";
import { createGroup, resetGroupState } from "../../../store/groupSlice";
import { toast } from "react-toastify";
import {
  FaUsers,
  FaTag,
  FaPlus,
  FaTimes,
  FaCheck,
  FaArrowRight,
  FaPenFancy,
  FaUser,
  FaEnvelope,
  FaCoins,
  FaCloudUploadAlt,
  FaTrashAlt,
  FaExclamationCircle,
  FaMagic,
  FaChevronDown,
  FaUserCheck,
} from "react-icons/fa";
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../../utils/categoryInfer";
import { CURRENCIES, CURRENCY_SYMBOLS } from "../../../utils/currency";

// Normalize email the same way the backend does. The email→user lookup
// + invite creation happens on submit, server-side.
const normalizeEmail = (raw) => String(raw || "").trim().toLowerCase();
const isValidEmail = (e) => /^\S+@\S+\.\S+$/.test(e);

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
  // The new group's currency defaults to the creator's personal
  // preference, but is a per-GROUP setting from here on (everyone sees
  // it, no conversion). Fixed once the group is created.
  const { userInfo } = useSelector((s) => s.login);
  const [groupName, setGroupName] = useState("");
  const [category, setCategory] = useState("Others");
  const [categoryAuto, setCategoryAuto] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [currency, setCurrency] = useState(userInfo?.currency || "INR");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // members is an array of objects so we can carry an email alongside
  // the display name. Shape: { name, email? }. The email→user lookup +
  // invite happen server-side on submit.
  const [members, setMembers] = useState([]);
  const [memberInput, setMemberInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  // Add the creator as a member so their own spends in this group also
  // land in their Personal tab. On by default — most people are part of
  // the groups they create — but they can opt out.
  const [includeMe, setIncludeMe] = useState(true);
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

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAddMember = () => {
    const name = memberInput.trim();
    const email = emailInput.trim() ? normalizeEmail(emailInput) : "";
    if (!name) {
      setErrors((p) => ({ ...p, members: "Add a name for this person." }));
      return;
    }
    if (email && !isValidEmail(email)) {
      setErrors((p) => ({
        ...p,
        members: "That doesn't look like a valid email.",
      }));
      return;
    }

    // Block duplicates by either name OR email.
    const dupName = members.some(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );
    const dupEmail = email && members.some((m) => m.email === email);
    if (dupName) {
      setErrors((p) => ({ ...p, members: "That name has already been added." }));
      return;
    }
    if (dupEmail) {
      setErrors((p) => ({ ...p, members: "That email has already been added." }));
      return;
    }

    setMembers([...members, { name, email: email || null }]);
    setMemberInput("");
    setEmailInput("");
    clearError("members");
  };

  // Enter on either input adds the member; convenient on desktop and
  // mobile where the "Add" tap target may be small.
  const handleMemberKey = (e) => {
    if (e.key === "Enter") {
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
    setCurrency(userInfo?.currency || "INR");
    setShowCurrencyPicker(false);
    setIncludeMe(true);
    clearImage();
    setMembers([]);
    setMemberInput("");
    setEmailInput("");
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
    formData.append("currency", currency);
    formData.append("includeMe", includeMe);
    if (groupImage) formData.append("image", groupImage);
    // Each member is JSON-encoded {name, email?}. The backend parses
    // these, matches emails to existing users, and creates invites
    // server-side. Members without an email (or whose email doesn't
    // match) save as offline and never block group creation.
    members.forEach((m) =>
      formData.append(
        "members",
        JSON.stringify({ name: m.name, email: m.email || undefined })
      )
    );
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
          <div className="newGroup__cols">
            <div className="newGroup__col">
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

            <div className="newGroup__autocat">
              <label className="newGroup__autocat-label">
                <FaCoins /> Currency
              </label>
              <button
                type="button"
                className={`newGroup__autotag ${
                  showCurrencyPicker ? "newGroup__autotag--open" : ""
                }`}
                onClick={() => setShowCurrencyPicker((v) => !v)}
              >
                <span>{CURRENCY_SYMBOLS[currency] || "¤"}</span>
                <strong>{currency}</strong>
                <FaChevronDown className="newGroup__autotag-chev" />
              </button>
              {showCurrencyPicker && (
                <div className="ng-chips">
                  {CURRENCIES.map((c) => (
                    <button
                      type="button"
                      key={c.code}
                      className={`ng-chip ${
                        currency === c.code ? "ng-chip--active" : ""
                      }`}
                      onClick={() => {
                        setCurrency(c.code);
                        setShowCurrencyPicker(false);
                      }}
                    >
                      <span className="ng-chip__emoji">{c.symbol}</span>
                      {c.code}
                    </button>
                  ))}
                </div>
              )}
              <span className="ng-field__hint">
                Everyone in this group sees amounts in this currency — it
                can&apos;t be changed once the group is created.
              </span>
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

            </div>
            <div className="newGroup__col">
          <section className="ng-section">
            <div className="ng-section__head">
              <span className="ng-section__step">3</span>
              <div>
                <h2>Members</h2>
              </div>
            </div>

            <label className="ng-includeme">
              <input
                type="checkbox"
                checked={includeMe}
                onChange={(e) => setIncludeMe(e.target.checked)}
              />
              <span className="ng-includeme__text">
                <strong>Include me in this group</strong>
                <small>
                  Expenses you pay here also show up in your Personal tab.
                </small>
              </span>
            </label>

            <div className="ng-member-add">
              <div
                className={`ng-member-input ${
                  errors.members ? "ng-member-input--error" : ""
                }`}
              >
                <FaUser />
                <input
                  type="text"
                  placeholder="Name"
                  value={memberInput}
                  onChange={(e) => {
                    setMemberInput(e.target.value);
                    if (errors.members) clearError("members");
                  }}
                  onKeyDown={handleMemberKey}
                  maxLength={40}
                />
              </div>
              <div className="ng-member-input ng-member-input--phone">
                <FaEnvelope />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleMemberKey}
                />
              </div>
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

            <p className="ng-member-hint">
              <FaUserCheck />
              <span>
                If their email is on splitit they&apos;ll get an invite. If
                not, they&apos;re added as an offline member.
              </span>
            </p>

            {errors.members && (
              <span className="ng-field__error ng-field__error--block">
                <FaExclamationCircle />
                {errors.members}
              </span>
            )}

            {members.length > 0 ? (
              <ul className="ng-members">
                {members.map((member, index) => (
                  <li
                    key={`${member.name}-${index}`}
                    className="ng-member"
                  >
                    <span className="ng-member__avatar">
                      {initials(member.name)}
                    </span>
                    <span className="ng-member__name">
                      {member.name}
                      {member.email && (
                        <small className="ng-member__phone">
                          {member.email}
                        </small>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ng-members__empty">
                <FaUsers />
                <span>No members yet — that&apos;s okay, you can add them later.</span>
              </div>
            )}
          </section>
            </div>
          </div>

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
      </div>
    </div>
  );
};

export default NewGroup;
