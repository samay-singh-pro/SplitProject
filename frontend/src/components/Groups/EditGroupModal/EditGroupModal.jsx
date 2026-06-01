import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import "./EditGroupModal.scss";
import {
  updateGroup,
  addGroupMember,
  removeGroupMember,
} from "../../../store/groupSlice";
import { fetchGroupStats } from "../../../store/statsSlice";
import {
  inferCategory,
  CATEGORY_EMOJI,
  ALL_CATEGORIES,
} from "../../../utils/categoryInfer";
import { getCurrencySymbol } from "../../../utils/currency";
import {
  FaTimes,
  FaCheck,
  FaPenFancy,
  FaTag,
  FaUserPlus,
  FaEnvelope,
  FaUserCheck,
  FaMagic,
  FaChevronDown,
  FaCloudUploadAlt,
  FaImage,
  FaTrashAlt,
  FaExclamationTriangle,
  FaUserSlash,
} from "react-icons/fa";

const initials = (value) => {
  if (!value) return "?";
  const segments = value.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EditGroupModal = ({ open, group, onClose }) => {
  const dispatch = useDispatch();
  const symbol = getCurrencySymbol(group?.currency);
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Others");
  const [categoryAuto, setCategoryAuto] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Initialise from group every time the modal opens.
  useEffect(() => {
    if (!open || !group) return;
    setName(group.name || "");
    setDescription(group.description || "");
    setCategory(group.category || "Others");
    setCategoryAuto(false); // start in manual mode for edits
    setShowCategoryPicker(false);
    setImageFile(null);
    setImagePreview(null);
    setNewMemberName("");
    setNewMemberEmail("");
    setMemberError("");
    setFieldErrors({});
  }, [open, group]);

  if (!open || !group) return null;

  const activeMembers = (group.members || []).filter((m) => !m.removed);
  const removedMembers = (group.members || []).filter((m) => m.removed);

  const handleNameChange = (val) => {
    setName(val);
    setFieldErrors((p) => ({ ...p, name: undefined }));
    if (categoryAuto) {
      const guess = inferCategory(`${val} ${description}`);
      if (guess) setCategory(guess);
    }
  };

  const handleDescriptionChange = (val) => {
    setDescription(val);
    if (categoryAuto) {
      const guess = inferCategory(`${name} ${val}`);
      if (guess) setCategory(guess);
    }
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveBasics = async () => {
    const errs = {};
    if (!name.trim()) errs.name = "Give your group a name.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    if (imageFile) formData.append("image", imageFile);

    const result = await dispatch(
      updateGroup({ groupId: group._id, data: formData })
    );
    setSaving(false);

    if (result.type.endsWith("/fulfilled")) {
      toast.success("Group updated.");
      // Refresh stats too in case the image/name shows on the report.
      dispatch(fetchGroupStats(group._id));
      onClose?.();
    } else if (result.payload?.errors) {
      setFieldErrors(result.payload.errors);
    } else {
      toast.error(result.payload?.message || "Failed to update group.");
    }
  };

  const handleAddMember = async () => {
    const value = newMemberName.trim();
    if (!value) return;
    setAdding(true);
    setMemberError("");
    const result = await dispatch(
      addGroupMember({
        groupId: group._id,
        name: value,
        email: newMemberEmail.trim(),
      })
    );
    setAdding(false);

    if (result.type.endsWith("/fulfilled")) {
      setNewMemberName("");
      setNewMemberEmail("");
    } else {
      const err =
        result.payload?.errors?.email ||
        result.payload?.errors?.name ||
        result.payload?.message ||
        "Failed to add member.";
      setMemberError(err);
    }
  };

  const handleRemoveMember = async (member) => {
    setMemberError("");
    const result = await dispatch(
      removeGroupMember({ groupId: group._id, memberId: member._id })
    );

    if (result.type.endsWith("/fulfilled")) {
      // success — group is updated in store via reducer
      dispatch(fetchGroupStats(group._id));
    } else if (result.payload?.code === "UNSETTLED_BALANCE") {
      const d = result.payload.details || {};
      const verb = d.direction === "is_owed" ? "is owed" : "owes";
      const amt = formatMoney(Math.abs(d.netBalance || 0));
      toast.error(
        `Can't remove ${d.name}: still ${verb} ${symbol}${amt}. Settle that balance first.`,
        { autoClose: 5000 }
      );
    } else {
      toast.error(result.payload?.message || "Failed to remove member.");
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="editGroup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Edit group"
      onMouseDown={handleBackdrop}
    >
      <div className="editGroup">
        <header className="editGroup__head">
          <div>
            <h3>Edit group</h3>
            <span>{group.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="editGroup__close"
          >
            <FaTimes />
          </button>
        </header>

        <div className="editGroup__body">
          {/* ---------- Basics ---------- */}
          <section className="editGroup__section">
            <h4>Details</h4>

            <div
              className={`editGroup__field ${
                fieldErrors.name ? "editGroup__field--error" : ""
              }`}
            >
              <label>
                <FaPenFancy /> Group name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={50}
              />
              {fieldErrors.name && (
                <span className="editGroup__err">{fieldErrors.name}</span>
              )}
            </div>

            <div className="editGroup__field">
              <label>
                <FaTag /> Purpose <span className="editGroup__opt">optional</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
            </div>

            <div className="editGroup__field">
              <label>
                <FaTag /> Category
              </label>
              <button
                type="button"
                className={`editGroup__autotag ${
                  showCategoryPicker ? "editGroup__autotag--open" : ""
                }`}
                onClick={() => setShowCategoryPicker((v) => !v)}
              >
                {categoryAuto && <FaMagic />}
                <span>{CATEGORY_EMOJI[category] || "✨"}</span>
                <strong>{category}</strong>
                <FaChevronDown className="editGroup__autotag-chev" />
              </button>

              {showCategoryPicker && (
                <div className="editGroup__cats">
                  {ALL_CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`editGroup__cat ${
                        category === c ? "editGroup__cat--active" : ""
                      }`}
                      onClick={() => {
                        setCategory(c);
                        setCategoryAuto(false);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <span>{CATEGORY_EMOJI[c]}</span>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="editGroup__field">
              <label>
                <FaImage /> Cover image{" "}
                <span className="editGroup__opt">optional</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => handleImageSelect(e.target.files?.[0])}
                hidden
              />

              {imagePreview || group.image ? (
                <div className="editGroup__image-preview">
                  <img src={imagePreview || group.image} alt="" />
                  <div className="editGroup__image-actions">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        className="editGroup__image-remove"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <FaTrashAlt /> Undo
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="editGroup__image-empty"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FaCloudUploadAlt /> Upload an image
                </button>
              )}
            </div>
          </section>

          {/* ---------- Members ---------- */}
          <section className="editGroup__section">
            <h4>Members</h4>

            <div className="editGroup__add-grid">
              <div className="editGroup__add editGroup__add--name">
                <FaUserPlus />
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => {
                    setNewMemberName(e.target.value);
                    setMemberError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Name"
                  maxLength={40}
                />
              </div>
              <div className="editGroup__add editGroup__add--phone">
                <FaEnvelope />
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => {
                    setNewMemberEmail(e.target.value);
                    setMemberError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Email (optional)"
                />
              </div>
              <button
                type="button"
                className="editGroup__add-btn"
                onClick={handleAddMember}
                disabled={!newMemberName.trim() || adding}
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>

            <p className="editGroup__add-hint">
              <FaUserCheck />
              If their email is on splitit they&apos;ll get an invite —
              otherwise they&apos;re added as an offline member.
            </p>

            {memberError && (
              <span className="editGroup__err">{memberError}</span>
            )}

            <ul className="editGroup__members">
              {activeMembers.length === 0 && (
                <li className="editGroup__empty">No members yet.</li>
              )}
              {activeMembers.map((m) => (
                <li key={m._id} className="editGroup__member">
                  <span className="editGroup__avatar">
                    {initials(m.name)}
                  </span>
                  <span className="editGroup__member-name">
                    {m.name}
                    {m.email && (
                      <small className="editGroup__member-phone">
                        {m.email}
                      </small>
                    )}
                  </span>
                  <button
                    type="button"
                    className="editGroup__member-remove"
                    onClick={() => handleRemoveMember(m)}
                    aria-label={`Remove ${m.name}`}
                    title="Remove member"
                  >
                    <FaUserSlash />
                  </button>
                </li>
              ))}
            </ul>

            {removedMembers.length > 0 && (
              <div className="editGroup__removed">
                <small>Past members (still in history)</small>
                <ul>
                  {removedMembers.map((m) => (
                    <li key={m._id}>
                      <span className="editGroup__avatar editGroup__avatar--dim">
                        {initials(m.name)}
                      </span>
                      <span>{m.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="editGroup__note">
              <FaExclamationTriangle />
              Members with unsettled balances can&apos;t be removed — settle
              them first to keep the math intact.
            </p>
          </section>
        </div>

        <footer className="editGroup__footer">
          <button
            type="button"
            className="editGroup__btn editGroup__btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            type="button"
            className="editGroup__btn editGroup__btn--primary"
            onClick={handleSaveBasics}
            disabled={saving}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FaCheck /> Save changes
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default EditGroupModal;
