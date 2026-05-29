import "./GroupCard.scss";
import { FaUsers, FaImage, FaArrowRight } from "react-icons/fa";
import { CATEGORY_EMOJI } from "../../../utils/categoryInfer";

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

const GroupCard = ({ group, onOpen }) => {
  const members = group.members || [];
  const emoji = CATEGORY_EMOJI[group.category] || "✨";

  return (
    <button
      type="button"
      className="groupCard"
      onClick={() => onOpen?.(group)}
      aria-label={`Open insights for ${group.name}`}
    >
      <div className="groupCard__cover">
        {group.image ? (
          <img src={group.image} alt="" />
        ) : (
          <div className="groupCard__cover-fallback">
            <FaImage />
          </div>
        )}
        {group.category && (
          <span className="groupCard__category">
            <span>{emoji}</span>
            {group.category}
          </span>
        )}
      </div>

      <div className="groupCard__body">
        <h3 className="groupCard__title" title={group.name}>
          {group.name}
        </h3>
        <p className="groupCard__desc">
          {group.description || "No description added."}
        </p>

        <div className="groupCard__footer">
          <div className="groupCard__avatars">
            {members.slice(0, 4).map((m, i) => (
              <span key={m._id || i} className="groupCard__avatar">
                {initials(m.name)}
              </span>
            ))}
            {members.length > 4 && (
              <span className="groupCard__avatar groupCard__avatar--more">
                +{members.length - 4}
              </span>
            )}
            {members.length === 0 && (
              <span className="groupCard__avatar groupCard__avatar--empty">
                <FaUsers />
              </span>
            )}
          </div>

          <span className="groupCard__cta">
            View insights <FaArrowRight />
          </span>
        </div>
      </div>
    </button>
  );
};

export default GroupCard;
